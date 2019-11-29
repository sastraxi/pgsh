#! /usr/bin/env node
require('dotenv').config({ encoding: 'utf8' });

const fs = require('fs');
const crypto = require('crypto');
const Knex = require('knex');

const randomString = (halfLen = 10) =>
  crypto.randomBytes(halfLen).toString('hex');

const explodeUrl = require('./util/explode-url');
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
  force_disable_telemetry: true,
};

const env = {
  KNEXAPP_DB_DATABASE: process.env.DANGER_INTEGRATION_DATABASE,
  KNEXAPP_DB_HOST: process.env.DANGER_INTEGRATION_HOST,
  KNEXAPP_DB_PORT: process.env.DANGER_INTEGRATION_PORT,
  KNEXAPP_DB_USER: process.env.DANGER_INTEGRATION_USER,
  KNEXAPP_DB_PASSWORD: process.env.DANGER_INTEGRATION_PASSWORD,
};

const integrationDb = process.env.DANGER_INTEGRATION_DATABASE;
const integrationUrl = `postgres://${env.KNEXAPP_DB_USER}:${env.KNEXAPP_DB_PASSWORD}`
  + `@${env.KNEXAPP_DB_HOST}:${env.KNEXAPP_DB_PORT}/${env.KNEXAPP_DB_DATABASE}`;

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
  const pgsh = pgshWithEnv({ ...process.env, ...env });

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

it('does fine if there is no .pgshrc', async () => {
  const ctx = makeContext(`${__dirname}/knexapp`, null, env);
  const { pgsh } = ctx;

  { // any execution will exit 1
    const { exitCode, errors } = pgsh('ls');
    await consume(errors, line => expect(line).toEqual(
      'pgsh is configured to use the value of DATABASE_URL in your .env file, but it is unset. Exiting.',
    ), numLines(1));
    expect(await exitCode).toBe(54);
  }
});

it('fails if .env is empty', async () => {
  const ctx = makeContext(`${__dirname}/knexapp`, config, {});
  const { pgsh } = ctx;

  { // any execution will exit 1
    const { exitCode, errors } = pgsh('ls');
    await consume(errors, line => expect(line).toEqual(
      'pgsh is configured to use the value of KNEXAPP_DB_DATABASE in your .env file, but it is unset. Exiting.',
    ), numLines(1));
    expect(await exitCode).toBe(54);
  }
});

it('fails if there is no .env', async () => {
  const ctx = makeContext(`${__dirname}/knexapp`, config, null);
  const { pgsh } = ctx;

  { // any execution will exit 1
    const { exitCode, output, errors } = pgsh('ls');
    await consume(output, console.log);
    await consume(errors, line => expect(line).toEqual(
      'pgsh is configured to use the value of KNEXAPP_DB_DATABASE in your .env file, but it is unset. Exiting.',
    ), numLines(1));
    expect(await exitCode).toBe(54);
  }
});

it('warns about cloning if regular user does not have CREATEDB', async () => {
  const knex = Knex({
    client: 'pg',
    connection: explodeUrl(integrationUrl),
  });

  const password = randomString();
  const user = `user_${randomString(3)}`;
  await knex.raw(`CREATE ROLE ${user} LOGIN NOCREATEDB PASSWORD '${password}'`);
  env[config.vars.user] = user;
  env[config.vars.password] = password;

  const ctx = makeContext(`${__dirname}/knexapp`, null, env);
  const { pgsh } = ctx;
  { // set up!
    const {
      exitCode, output, errors, send,
    } = pgsh('init');
    await consume(output, null, numLines(6));
    await send.down();
    await send.enter();
    await consume(output, null, numLines(6));
    await send.enter();
    await consume(output, null, numLines(5));
    await send.enter();
    await consume(output, null, numLines(4));
    await send.enter();
    await consume(output, null, numLines(3));
    await send.enter();
    await consume(output, null, numLines(2));
    await send.enter();
    await consume(output, null, numLines(1));
    await consume(output, line => expect(line).toEqual(''), numLines(1));
    await consume(output, line => expect(line).toEqual(
      `You are connecting as an underprivileged user ${user}.`,
    ), numLines(1));
    await send.ctrlC();
    await consume(errors, line => expect(line).toEqual(
      'pgsh init failed: Either add variables for a superuser '
        + 'name and password to .env, or modify your existing '
        + `user with ALTER ROLE ${user} CREATEDB.`,
    ), numLines(1));
    expect(await exitCode).toBe(2);
  }

  await knex.raw(`DROP ROLE ${user}`);
  return new Promise(resolve => knex.destroy(resolve));
});

it('creates the correct .pgshrc via init without superuser credentials', async () => {
  const knex = Knex({
    client: 'pg',
    connection: explodeUrl(integrationUrl),
  });

  const password = randomString();
  const user = `user_${randomString(3)}`;
  await knex.raw(`CREATE ROLE ${user} LOGIN CREATEDB PASSWORD '${password}'`);
  env[config.vars.user] = user;
  env[config.vars.password] = password;

  const ctx = makeContext(`${__dirname}/knexapp`, null, env);
  const { pgsh } = ctx;
  { // set up!
    const { exitCode, output, send } = pgsh('init');
    await consume(output, null, numLines(6));
    await send.down();
    await send.enter();
    await consume(output, null, numLines(6));
    await send.enter();
    await consume(output, null, numLines(5));
    await send.enter();
    await consume(output, null, numLines(4));
    await send.enter();
    await consume(output, null, numLines(3));
    await send.enter();
    await consume(output, null, numLines(2));
    await send.enter();
    await consume(output, null, numLines(1));
    await consume(output, line => expect(line).toEqual(''), numLines(1));
    await consume(output, line => expect(line).toEqual(
      `Your environment currently points to ${integrationDb}.`,
    ), numLines(1));
    await send.enter();
    expect(await exitCode).toBe(0);
  }

  const writtenConfig = fs.readFileSync(`${__dirname}/knexapp/.pgshrc`, { encoding: 'utf8' });
  const { mode, vars } = JSON.parse(writtenConfig);
  expect(mode).toEqual('split');
  Object.keys(vars).forEach(key =>
    expect(vars[key]).toEqual(config.vars[key]));

  await knex.raw(`DROP ROLE ${user}`);
  return new Promise(resolve => knex.destroy(resolve));
});

it('warns about pgsh ls if user has no pg_stat_file grant', async () => {
  const knex = Knex({
    client: 'pg',
    connection: explodeUrl(integrationUrl),
  });

  const password = randomString();
  const user = `user_${randomString(3)}`;
  await knex.raw(`CREATE ROLE ${user} LOGIN CREATEDB PASSWORD '${password}'`);
  env[config.vars.user] = user;
  env[config.vars.password] = password;

  const ctx = makeContext(`${__dirname}/knexapp`, config, env);
  const { pgsh } = ctx;
  { // set up!
    const { exitCode, errors } = pgsh('ls', '-c');
    await consume(errors, line => expect(line).toEqual(
      'WARNING: pg_stat_file not avaiable; not sorting by creation.',
    ), numLines(1));
    expect(await exitCode).toBe(0);
  }

  await knex.raw(`DROP ROLE ${user}`);
  return new Promise(resolve => knex.destroy(resolve));
});
