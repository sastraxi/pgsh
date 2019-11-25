#! /usr/bin/env node
require('dotenv').config();

const pick = require('lodash.pick');
const crypto = require('crypto');

const randomString = (halfLen = 10) =>
  crypto.randomBytes(halfLen).toString('hex');

const makeContext = require('./util/context');
const listDatabases = require('./db/list');
const resetEntireDatabase = require('./db/reset-entire-database');

const config = {
  mode: 'split',
  vars: {
    host: 'DANGER_INTEGRATION_HOST',
    port: 'DANGER_INTEGRATION_PORT',
    user: 'DANGER_INTEGRATION_USER',
    password: 'DANGER_INTEGRATION_PASSWORD',
    database: 'DANGER_INTEGRATION_DATABASE',
  },
  migrations: {
    backend: 'knex',
  },
};

const env = pick(process.env, [
  'DANGER_INTEGRATION_HOST',
  'DANGER_INTEGRATION_PORT',
  'DANGER_INTEGRATION_USER',
  'DANGER_INTEGRATION_PASSWORD',
  'DANGER_INTEGRATION_DATABASE',
]);

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
      exitCode, output, send, stderr,
    } = pgsh('create', databaseWithMigrations, '--no-switch');
    stderr.on('data', console.error);
    await consume(output, console.log, numLines(2));
    send.down(); // run migrations
    send.enter();
    consume(output, console.log);
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
    const {
      exitCode, output, send, stderr,
    } = pgsh('create', database);
    stderr.on('data', console.error);
    await consume(output, null, numLines(2));
    await send.down(); // run migrations
    await send.enter();
    expect(await exitCode).toBe(0);
  }
  { // ensure we're at the latest migration
    const { exitCode, output } = pgsh('status', '-a');
    await consume(output, line => expect(line).toMatch(
      new RegExp(`^${escapeRegex(`* ${database} 002_migrate.js`)}`),
    ), numLines(1));
    expect(await exitCode).toBe(0);
  }
});
