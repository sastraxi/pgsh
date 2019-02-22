const knex = require('knex');
const c = require('ansi-colors');
const debug = require('debug')('pgsh:db');

const existingConfig = require('./config');

const updateExistingEnv = require('./env/update-existing');
const findDir = require('./util/find-dir');

const REGEX_DATABASE_URL = new RegExp(
  '^postgres://([^:]+):([^@]+)@([^:]+):(\\d+)/(.+)$',
  'i',
);

module.exports = (config = existingConfig) => {
  const combineUrl = ({
    user,
    password,
    host,
    port,
    database,
  }) =>
    `postgres://${user}:${password}@${host}:${port}/${database}`;

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

  const getMigrationsPath = () =>
    findDir(
      config.migrations.path || 'migrations',
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
      connection.user = process.env[config.vars.super_user];
      connection.password = process.env[config.vars.super_password];
    }
    return knex({
      client: 'pg',
      connection,
      ...knexMigrationsOptions(),
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

  const fallbackUrl = () =>
    thisUrl(config.fallback_database);

  const databaseNames = async (showTemplates = false) => {
    const getNames = (...connectionArgs) => {
      const db = connectAsSuper(...connectionArgs);
      return db.raw(`
        SELECT datname
        FROM pg_database
        WHERE datistemplate = ?
      `, [showTemplates])
        .then(({ rows }) => rows.map(row => row.datname));
    };

    // first attempt to connect to the given database;
    // if that does not work, fall back to the built-in "postgres"
    try {
      const names = await getNames();
      return names;
    } catch (err) {
      const { message } = err;
      debug(`databaseNames: ${c.redBright(message)}`);
      debug(`databaseNames: using ${c.yellowBright(config.fallback_database)} instead`);
      return getNames(thisUrl(config.fallback_database));
    }
  };

  const isValidDatabase = async (name) => {
    const names = await databaseNames();
    return names.includes(name);
  };

  const switchTo = (database) => {
    if (URL_MODE) {
      updateExistingEnv({
        [config.vars.url]: thisUrl(database),
      }, { throwIfUnchanged: false });
    } else {
      updateExistingEnv({
        [config.vars.database]: database,
      }, { throwIfUnchanged: false });
    }
  };

  return {
    thisDb,
    thisUrl,
    fallbackUrl,
    combineUrl,

    getMigrationsPath,

    connect,
    connectAsSuper,
    createSuperPostgresEnv,

    databaseNames,
    isValidDatabase,
    switchTo,
  };
};
