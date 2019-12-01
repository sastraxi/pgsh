const fs = require('fs');
const Knex = require('knex');

const { consume, numLines } = require('./util/stream-utils');
const explodeUrl = require('./util/explode-url');
const makeContext = require('./util/context');
const randomString = require('../../src/util/random-string');

const pgshGlobal = require('../../src/global');
const { METRICS_ENABLED } = require('../../src/global/keys');

const APP = 'knexapp';
const cwd = require('./app/cwd')(APP);
const { env, config } = require('./app/dotfiles')(APP);

const integrationDb = require('./db/integration-db');
const integrationUrl = require('./db/integration-url');

it('warns about cloning if regular user does not have CREATEDB', async () => {
  const knex = Knex({
    client: 'pg',
    connection: explodeUrl(integrationUrl),
  });

  pgshGlobal.set(METRICS_ENABLED, false);

  const password = randomString();
  const user = `user_${randomString(3)}`;
  await knex.raw(`CREATE ROLE ${user} LOGIN NOCREATEDB PASSWORD '${password}'`);
  env[config.vars.user] = user;
  env[config.vars.password] = password;

  const ctx = makeContext(cwd, null, env);
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

  pgshGlobal.set(METRICS_ENABLED, false);

  const password = randomString();
  const user = `user_${randomString(3)}`;
  await knex.raw(`CREATE ROLE ${user} LOGIN CREATEDB PASSWORD '${password}'`);
  env[config.vars.user] = user;
  env[config.vars.password] = password;

  const ctx = makeContext(cwd, null, env);
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

  const writtenConfig = fs.readFileSync(`${cwd}/.pgshrc`, { encoding: 'utf8' });
  const { mode, vars } = JSON.parse(writtenConfig);
  expect(mode).toEqual('split');
  Object.keys(vars).forEach(key =>
    expect(vars[key]).toEqual(config.vars[key]));

  await knex.raw(`DROP ROLE ${user}`);
  return new Promise(resolve => knex.destroy(resolve));
});
