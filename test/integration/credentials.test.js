const Knex = require('knex');

const { consume, numLines } = require('./util/stream-utils');
const explodeUrl = require('./util/explode-url');
const makeContext = require('./util/context');
const randomString = require('../../src/util/random-string');

const APP = 'knexapp';
const cwd = require('./app/cwd')(APP);
const { env, config } = require('./app/dotfiles')(APP);

const integrationUrl = require('./db/integration-url');

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

  const ctx = makeContext(cwd, config, env);
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
