#! /usr/bin/env node
require('dotenv').config({ encoding: 'utf8' });

const crypto = require('crypto');

const randomString = (halfLen = 10) =>
  crypto.randomBytes(halfLen).toString('hex');

const makeContext = require('./util/context');
const listDatabases = require('./db/list');
const resetEntireDatabase = require('./db/reset-entire-database');

const config = {
  mode: 'split',
  vars: {
    host: 'KNEXAPP_DB_HOST',
    port: 'KNEXAPP_DB_PORT',
    user: 'KNEXAPP_DB_USER',
    password: 'KNEXAPP_DB_PASSWORD',
    database: 'KNEXAPP_DB_DATABASE',
  },
  migrations: {
    backend: 'knex',
  },
};

const env = {
  KNEXAPP_DB_HOST: process.env.DANGER_INTEGRATION_HOST,
  KNEXAPP_DB_PORT: process.env.DANGER_INTEGRATION_PORT,
  KNEXAPP_DB_USER: process.env.DANGER_INTEGRATION_USER,
  KNEXAPP_DB_PASSWORD: process.env.DANGER_INTEGRATION_PASSWORD,
  KNEXAPP_DB_DATABASE: process.env.DANGER_INTEGRATION_DATABASE,
};

const integrationDb = process.env.DANGER_INTEGRATION_DATABASE;

const consume = async (output, lineCb, shouldExit) => {
  let iterations = 0;
  // eslint-disable-next-line no-await-in-loop
  for (let line = await output.next(); !line.done; line = await output.next()) {
    if (lineCb) lineCb(line.value);
    iterations += 1;
    if (!!shouldExit && shouldExit()) break;
  }
  return iterations;
};

/**
 * Returns false exactly n times; true thereafter.
 */
const numLines = (n) => {
  let count = 0;
  return () => {
    if (count >= n) return true;
    count += 1;
    return (count === n);
  };
};

const escapeRegex = s =>
  s.replace(/[-\\^$*+?.()|[\]{}]/g, '\\$&');

beforeAll(async () => {
  // reasonable timeout for integration tests
  jest.setTimeout(30 * 1000);

  // purge all databases
  const ctx = makeContext(`${__dirname}/knexapp`, config, env);
  return resetEntireDatabase(ctx);
});

it('identifies the current db as the integration database', async () => {
  const { pgsh } = makeContext(`${__dirname}/knexapp`, config, env);
  const { exitCode, output } = pgsh('list');

  consume(output, (line) => {
    if (line.startsWith('*')) {
      expect(line).toEqual(`* ${integrationDb}`);
    }
  });

  expect(await exitCode).toBe(0);
});

it('lists out all the databases that currently exist', async () => {
  const ctx = makeContext(`${__dirname}/knexapp`, config, env);
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
  const databases = await listDatabases(ctx, { showBuiltIn: false });
  const { exitCode, output } = pgsh('list', '--no-verbose');

  const foundNames = [];
  await consume(output, line => foundNames.push(line.replace('*', '').trim()));
  expect(foundNames.sort()).toEqual(databases.sort());
  expect(await exitCode).toBe(0);
});

it('migrates properly upon creation', async () => {
  const ctx = makeContext(`${__dirname}/knexapp`, config, env);
  const { pgsh } = ctx;

  const database = randomString();

  { // create, run migrations, and switch
    const { exitCode, output, send } = pgsh('create', database);
    await consume(output, null, numLines(2));
    await send.down(); // run migrations
    await send.enter();
    expect(await exitCode).toBe(0);
  }
  { // ensure we're at the latest migration
    const { exitCode, output } = pgsh('status', '-a');
    await consume(output, line => expect(line).toMatch(
      new RegExp(`^${escapeRegex(`* ${database} 20191124331980_data.js`)}`),
    ), numLines(1));
    expect(await exitCode).toBe(0);
  }
});

it('can migrate up and down successfully', async () => {
  const ctx = makeContext(`${__dirname}/knexapp`, config, env);
  const { pgsh } = ctx;

  const database = randomString();

  { // create and switch but don't run migrations
    const { exitCode, output } = pgsh('create', database, '--no-migrate');
    await consume(output);
    expect(await exitCode).toBe(0);
  }
  { // ensure we're *not* migrated
    const { exitCode, output } = pgsh('status', '--no-verbose');
    await consume(output, line => expect(line).toEqual(`* ${database}`), numLines(1));

    const EXPECTED_UNMIGRATED = [
      '20191124214437_init.js',
      '20191124305523_add_image_url.js',
      '20191124331980_data.js',
    ];
    const unmigrated = [];
    await consume(output, (line) => {
      const [mark, name] = line.trim().split(' ');
      if (mark === '?') {
        unmigrated.push(name);
      }
    });
    expect(unmigrated.sort()).toEqual(EXPECTED_UNMIGRATED.sort());
    expect(await exitCode).toBe(0);
  }
  { // migrate up
    const { exitCode, output } = pgsh('up');
    await consume(output);
    expect(await exitCode).toBe(0);
  }
  { // ensure we're at the latest migration
    const { exitCode, output } = pgsh('status');
    await consume(output, line => expect(line).toMatch(
      new RegExp(`^${escapeRegex(`* ${database} 20191124331980_data.js`)}`),
    ), numLines(1));
    expect(await exitCode).toBe(0);
  }
  { // migrate down to the first (and use its suffix to do so)
    const { exitCode, output } = pgsh('down', 'init');
    await consume(output, line => expect(line).toContain('↓'), numLines(2));
    await consume(output, line => expect(line).toMatch(
      new RegExp(`^${escapeRegex(`* ${database} 20191124214437_init.js`)}`),
    ), numLines(1));
    expect(await exitCode).toBe(0);
  }
  { // migrate up and ensure we're at the latest migration
    const { exitCode, output } = pgsh('up');
    await consume(output, line => expect(line).toContain('↑'), numLines(2));
    await consume(output, line => expect(line).toMatch(
      new RegExp(`^${escapeRegex(`* ${database} 20191124331980_data.js`)}`),
    ), numLines(1));
    expect(await exitCode).toBe(0);
  }
});

it('balks on unknown commands', async () => {
  const { pgsh } = makeContext(`${__dirname}/knexapp`, config, env);
  const { exitCode } = pgsh('badcmd');
  expect(await exitCode).toBe(1);
});

it('can switch back and forth', async () => {
  const ctx = makeContext(`${__dirname}/knexapp`, config, env);
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

it('can forcefully overwrite the current branch', async () => {
  const ctx = makeContext(`${__dirname}/knexapp`, config, env);
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
      new RegExp(`^${escapeRegex(`* ${database} 20191124331980_data.js`)}`),
    ), numLines(1));
    expect(await exitCode).toBe(0);
  }
});

it('fails if env is already injected', async () => {
  const ctx = makeContext(`${__dirname}/knexapp`, config, env);
  const { pgshWithEnv } = ctx;
  const pgsh = pgshWithEnv(env);

  { // any execution will fail with error 14!
    const { exitCode, errors } = pgsh('ls');

    await consume(errors, line => expect(line.split(' ')[0]).toEqual('FATAL:'), numLines(5));
    await consume(errors, null, numLines(1));
    await consume(errors, line => expect(line).toEqual(
      'UNSET these variables before running pgsh here.',
    ), numLines(1));

    expect(await exitCode).toBe(14);
  }
});
