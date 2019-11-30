const knex = require('knex');
const c = require('ansi-colors');
const debug = require('debug')('pgsh:db');
const { parse: parseUrl } = require('pg-connection-string');

const endProgram = require('./end-program');

const existingConfig = require('./config');
const updateExistingEnv = require('./env/update-existing');

const findDir = require('./util/find-dir');
const buildUrl = require('./util/build-url');

module.exports = (config = existingConfig) => {
  const combineUrl = buildUrl;

  const URL_MODE = config.mode === 'url';
  const testVar = URL_MODE ? config.vars.url : config.vars.database;

  if (!(testVar in process.env)) {
    console.error(
      `pgsh is configured to use the value of ${c.greenBright(testVar)}`
        + ` in your ${c.underline('.env')} file, but it is unset. Exiting.`,
    );
    return endProgram(54, true);
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
    const parsed = parseUrl(databaseUrl);
    Object.keys(parsed).forEach((key) => {
      if (parsed[key] === null) {
        parsed[key] = undefined; // nulls get coerced to "null" by psql
      }
    });
    return parsed;
  };

  const thisDb = () =>
    explodeUrl(DATABASE_URL).database;

  const createPostgresEnv = (databaseUrl = DATABASE_URL) => {
    const {
      user,
      password,
      host,
      port,
    } = explodeUrl(databaseUrl);
    return {
      PGUSER: user,
      PGPASSWORD: password,
      PGHOST: host,
      PGPORT: port,
    };
  };

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

  const DEFAULT_DB_NAMES_OPTIONS = {
    showTemplates: false,
    sortByCreation: false,
  };

  const SORT_CREATION = (a, b) => -a.created_at.localeCompare(b.created_at);
  const SORT_NAME = (a, b) => a.name.localeCompare(b.name);

  const databaseNames = async (options) => {
    const {
      showTemplates,
      sortByCreation,
    } = { ...DEFAULT_DB_NAMES_OPTIONS, ...(options || {}) };

    const getNames = async (...connectionArgs) => {
      const db = connectAsSuper(...connectionArgs); // pg_stat_file

      let names;
      try {
        names = await db.raw(`
          SELECT
            datname as name,
            (pg_stat_file('base/'||oid ||'/PG_VERSION')).modification::text as created_at
          FROM pg_database
          WHERE datistemplate = ?
        `, [showTemplates])
          .then(({ rows }) => rows
            .sort(sortByCreation ? SORT_CREATION : SORT_NAME)
            .map(row => row.name));
      } catch (err) {
        debug(err.code, err);
        if (+err.code === 42501) {
          // insufficient privileges; retry without created_at
          names = await db.raw(`
            SELECT datname as name
            FROM pg_database
            WHERE datistemplate = ?
          `, [showTemplates])
            .then(({ rows }) => rows
              .sort(SORT_NAME)
              .map(row => row.name));

          if (sortByCreation) {
            console.error(
              c.red('WARNING: pg_stat_file not avaiable; not sorting by creation.'),
            );
          }
        } else {
          throw err;
        }
      }

      await new Promise(resolve => db.destroy(resolve));
      return names;
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
      try {
        const gg = await getNames(thisUrl(config.fallback_database));
        return gg;
      } catch (fatalErr) {
        console.error(`${c.redBright('FATAL ERROR:')} could not read system catalogue.`);
        console.error(`Make sure that your ${c.underline('.pgshrc')} has vars for superuser credentials!`);
        return endProgram(55, true);
      }
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
    config,

    thisDb,
    thisUrl,
    fallbackUrl,
    combineUrl,
    explodeUrl,

    getMigrationsPath,

    connect,
    createPostgresEnv,
    connectAsSuper,
    createSuperPostgresEnv,

    databaseNames,
    isValidDatabase,
    switchTo,
  };
};
