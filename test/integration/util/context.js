const knex = require('knex');
const debug = require('debug')('integration:util:db:pg-factory'); // eslint-disable-line
const { parse: parseUrl } = require('pg-connection-string');

const execPgsh = require('./exec-pgsh');
const writeDotfiles = require('./write-dotfiles');
const findDir = require('../../../src/util/find-dir');
const combineUrl = require('../../../src/util/build-url');
const defaultConfig = require('../../../src/pgshrc/default');

const ALLOWED_HOSTS = [
  'localhost',
  '127.0.0.1',
  'dockerhost',
];

const explodeUrl = (databaseUrl) => {
  const parsed = parseUrl(databaseUrl);
  Object.keys(parsed).forEach((key) => {
    if (parsed[key] === null) {
      parsed[key] = undefined; // nulls get coerced to "null" by psql
    }
  });
  return parsed;
};

const modifyUrl = (modifications, databaseUrl) =>
  combineUrl({
    ...explodeUrl(databaseUrl),
    ...modifications,
  });

const makeContext = (cwd, pgshrc, dotenv) => {
  const env = dotenv || {};
  const config = pgshrc || defaultConfig;
  const URL_MODE = config.mode === 'url';

  const PGSH_URL = URL_MODE
    ? env[config.vars.url]
    : combineUrl({
      user: env[config.vars.user],
      password: env[config.vars.password],
      host: env[config.vars.host],
      port: env[config.vars.port],
      database: env[config.vars.database],
    });

  const testVar = URL_MODE ? config.vars.url : config.vars.database;
  const isValid = PGSH_URL !== undefined && (testVar in env);

  // our "context" object requires you to override connecting
  // to any database other than the integration test db explicitly
  const DATABASE_URL = isValid
    ? modifyUrl(
      { database: process.env.DANGER_INTEGRATION_DATABASE },
      PGSH_URL,
    )
    : undefined;

  const thisDb = () =>
    explodeUrl(DATABASE_URL).database;

  if (isValid) {
    const { host } = explodeUrl(DATABASE_URL);
    if (ALLOWED_HOSTS.indexOf(host) === -1) {
      throw new Error(
        'The integration test drops all other databases when it starts. '
          + 'As such, we only allow running it on localhost / dockerhost.',
      );
    }
  }

  /**
   * Returns the connection string, optionally
   * with a different database name at the end of it.
   */
  const thisUrl = database =>
    (database
      ? modifyUrl({ database }, DATABASE_URL)
      : DATABASE_URL);

  const fallbackUrl = () =>
    thisUrl(config.fallback_database);

  const getMigrationsPath = () =>
    findDir(
      config.migrations.path || 'migrations',
      cwd,
    ) || 'migrations';

  const knexMigrationsOptions = () => {
    const schema = config.migrations.schema || 'public';
    const table = config.migrations.table || 'knex_migrations';
    const migrations = { schemaName: schema, tableName: table };

    const migrationsPath = getMigrationsPath();
    if (migrationsPath) {
      migrations.directory = migrationsPath;
    }
    return { migrations };
  };

  const connect = (databaseUrl = DATABASE_URL) =>
    knex({
      client: 'pg',
      connection: explodeUrl(databaseUrl),
      ...knexMigrationsOptions(),
    });

  const connectAsSuper = (databaseUrl = DATABASE_URL) => {
    const connection = explodeUrl(databaseUrl);
    if (config.vars.super_user) {
      connection.user = env[config.vars.super_user];
      connection.password = env[config.vars.super_password];
    }

    return knex({
      client: 'pg',
      connection,
      ...knexMigrationsOptions(),
    });
  };

  // it begins: write the initial .pgshrc and .env
  writeDotfiles(cwd, { config: pgshrc, env: dotenv });
  return {
    isValid,
    connect,
    connectAsSuper,
    database: isValid ? thisDb() : undefined,
    integrationUrl: DATABASE_URL,
    pgshUrl: PGSH_URL,
    fallbackUrl: isValid ? fallbackUrl() : undefined,
    pgsh: (...args) => execPgsh(cwd, args),
    pgshWithEnv: envToInject => (...args) => execPgsh(cwd, args, envToInject),
  };
};

module.exports = makeContext;
