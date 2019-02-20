const knex = require('knex');
const c = require('ansi-colors');

const config = require('./config');
const updateExistingEnv = require('./env/update-existing');
const findDir = require('./util/find-dir');

const combineUrl = ({
  user,
  password,
  host,
  port,
  database,
}) =>
  `postgres://${user}:${password}@${host}:${port}/${database}`;

const REGEX_DATABASE_URL = new RegExp(
  '^postgres://([^:]+):([^@]+)@([^:]+):(\\d+)/(.+)$',
  'i',
);

const URL_MODE = config.mode === 'url';
const testVar = URL_MODE ? config.vars.url : config.vars.database;

if (!(testVar in process.env)) {
  console.error(
    `pgsh is configured to use the value of ${c.greenBright(testVar)}`
      + ` in your ${c.underline('.env')} file, but it is unset. Exiting.`,
  );
  process.exit(6);
}

const DATABASE_URL = URL_MODE
  ? process.env[config.vars.url]
  : combineUrl({
    user: process.env[config.vars.user],
    password: process.env[config.vars.password],
    host: process.env[config.vars.host],
    port: process.env[config.vars.port],
    database: process.env[config.vars.database],
  });

const explodeUrl = (databaseUrl) => {
  const [
    _full, // eslint-disable-line
    user, password,
    host, port, database,
  ] = REGEX_DATABASE_URL.exec(databaseUrl);
  return {
    user,
    password,
    host,
    port,
    database,
  };
};

const thisDb = () =>
  explodeUrl(DATABASE_URL).database;

const createSuperPostgresEnv = (databaseUrl = DATABASE_URL) => {
  const {
    user,
    password,
    host,
    port,
  } = explodeUrl(databaseUrl);
  return {
    PGUSER: process.env[config.vars.super_user] || user,
    PGPASSWORD: process.env[config.vars.super_password] || password,
    PGHOST: host,
    PGPORT: port,
  };
};

const connect = (extraOptions = {}, databaseUrl = DATABASE_URL) =>
  knex({
    client: 'pg',
    connection: explodeUrl(databaseUrl),
    ...extraOptions,
  });

const connectAsSuper = (extraOptions = {}, databaseUrl = DATABASE_URL) => {
  const connection = explodeUrl(databaseUrl);
  if (config.vars.super_user) {
    connection.user = process.env[config.vars.super_user];
    connection.password = process.env[config.vars.super_password];
  }
  return knex({
    client: 'pg',
    connection,
    ...extraOptions,
  });
};

const modifyUrl = (modifications, databaseUrl = DATABASE_URL) =>
  combineUrl({
    ...explodeUrl(databaseUrl),
    ...modifications,
  });

/**
 * Returns the connection string, optionally
 * with a different database name at the end of it.
 */
const thisUrl = database =>
  (database
    ? modifyUrl({ database }, DATABASE_URL)
    : DATABASE_URL);

const databaseNames = async () => {
  const db = connectAsSuper();
  return db.raw(`
    SELECT datname
    FROM pg_database
    WHERE datistemplate = false;
  `).then(({ rows }) => rows.map(row => row.datname));
};

const isValidDatabase = async (name) => {
  const names = await databaseNames();
  return names.includes(name);
};

const switchTo = (database) => {
  if (URL_MODE) {
    updateExistingEnv({
      [config.vars.url]: thisUrl(database),
    });
  } else {
    updateExistingEnv({
      [config.vars.database]: database,
    });
  }
};

const getMigrationsPath = () =>
  findDir(
    config.migrations.path || 'migrations',
  ) || 'migrations';

module.exports = {
  thisDb,
  thisUrl,
  getMigrationsPath,

  connect,
  connectAsSuper,
  createSuperPostgresEnv,

  databaseNames,
  isValidDatabase,
  switchTo,
};
