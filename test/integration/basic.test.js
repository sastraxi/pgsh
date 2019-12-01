const { consume } = require('./util/stream-utils');
const makeContext = require('./util/context');
const randomString = require('../../src/util/random-string');

const pgshGlobal = require('../../src/global');
const { METRICS_ENABLED } = require('../../src/global/keys');

const APP = 'knexapp';
const cwd = require('./app/cwd')(APP);
const { env, config } = require('./app/dotfiles')(APP);

const integrationDb = require('./db/integration-db');

it('identifies the current db as the integration database', async () => {
  pgshGlobal.set(METRICS_ENABLED, false);
  const { pgsh } = makeContext(cwd, config, env);
  const { exitCode, output } = pgsh('list');

  consume(output, (line) => {
    if (line.startsWith('*')) {
      expect(line).toEqual(`* ${integrationDb}`);
    }
  });

  expect(await exitCode).toBe(0);
});

it('balks on unknown commands', async () => {
  pgshGlobal.set(METRICS_ENABLED, false);
  const { pgsh } = makeContext(cwd, config, env);
  const { exitCode } = pgsh('badcmd');
  expect(await exitCode).toBe(1);
});

it('can switch back and forth', async () => {
  pgshGlobal.set(METRICS_ENABLED, false);
  const ctx = makeContext(cwd, config, env);
  const { pgsh } = ctx;

  const database = randomString();

  { // create, don't run migrations, but don't switch
    const { exitCode } = pgsh('create', database, '--no-migrate', '--no-switch');
    expect(await exitCode).toBe(0);
  }
  { // ensure we're on the integration database
    const { exitCode, output } = pgsh('current');
    await consume(output, l => expect(l).toEqual(integrationDb));
    expect(await exitCode).toBe(0);
  }
  { // switch to the new database
    const { exitCode } = pgsh('switch', database);
    expect(await exitCode).toBe(0);
  }
  { // ensure we're on the new database
    const { exitCode, output } = pgsh('current');
    await consume(output, l => expect(l).toEqual(database));
    expect(await exitCode).toBe(0);
  }
  { // switch to the integration database
    const { exitCode } = pgsh('switch', integrationDb);
    expect(await exitCode).toBe(0);
  }
  { // ensure we're on the integration database
    const { exitCode, output } = pgsh('current');
    await consume(output, l => expect(l).toEqual(integrationDb));
    expect(await exitCode).toBe(0);
  }
});
