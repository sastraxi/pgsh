const { consume, numLines } = require('./util/stream-utils');
const makeContext = require('./util/context');
const randomString = require('../../src/util/random-string');
const listDatabases = require('./db/list');

const APP = 'knexapp';
const cwd = require('./app/cwd')(APP);
const { env, config } = require('./app/dotfiles')(APP);

beforeAll(require('./util/setup')());

it('lists out all the databases that currently exist', async () => {
  const ctx = makeContext(cwd, config, env);
  const { pgsh } = ctx;

  const databaseWithMigrations = randomString();
  { // create and run migrations
    const {
      exitCode, output, send,
    } = pgsh('create', databaseWithMigrations, '--no-switch');
    await consume(output, null, numLines(2));
    send.down(); // run migrations
    send.enter();
    // consume(output, console.log);
    expect(await exitCode).toBe(0);
  }
  { // create only
    const { exitCode, output, send } = pgsh('create', randomString(), '--no-switch');
    await consume(output, null, numLines(2));
    send.enter();
    await exitCode;
  }

  // sanity test: compare our list of databases to pgsh's
  // (please note that this implementation is ~99% similar to pgsh's)
  const databases = await listDatabases(ctx.integrationUrl, { showBuiltIn: false });
  const { exitCode, output } = pgsh('list', '--no-verbose');

  const foundNames = [];
  await consume(output, line => foundNames.push(line.replace('*', '').trim()));
  expect(foundNames.sort()).toEqual(databases.sort());
  expect(await exitCode).toBe(0);
});
