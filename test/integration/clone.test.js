const matcher = require('./util/matcher');
const { consume, numLines } = require('./util/stream-utils');
const makeContext = require('./util/context');
const randomString = require('../../src/util/random-string');

const APP = 'knexapp';
const cwd = require('./app/cwd')(APP);
const { env, config } = require('./app/dotfiles')(APP);

beforeAll(require('./util/setup')({ cwd, config, env }));

it('can forcefully overwrite the current branch', async () => {
  const ctx = makeContext(cwd, config, env);
  const { pgsh } = ctx;

  const withMigrations = randomString();
  const database = randomString();

  { // create, run migrations, but don't switch
    const { exitCode } = pgsh('create', withMigrations, '--migrate', '--no-switch');
    expect(await exitCode).toBe(0);
  }
  { // create and switch
    const { exitCode } = pgsh('create', database, '--no-migrate', '--switch');
    expect(await exitCode).toBe(0);
  }
  { // ensure we have no migrations
    const { exitCode, output } = pgsh('status');
    await consume(output, line => expect(line).toEqual(`* ${database}`), numLines(1));
    expect(await exitCode).toBe(0);
  }
  { // clone over this database with the migrated one
    const { exitCode } = pgsh('clone', '-f', withMigrations, database);
    expect(await exitCode).toBe(0);
  }
  { // make sure we're at the latest migration now
    const { exitCode, output } = pgsh('status');
    await consume(output, line => expect(line).toMatch(
      matcher.startsWith(`* ${database} 20191124331980_data.js`),
    ), numLines(1));
    expect(await exitCode).toBe(0);
  }
});
