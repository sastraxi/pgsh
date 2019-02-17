const path = require('path');
const knex = require('knex');

const config = require('./config');
const replaceEnv = require('./util/replace-env');
const findDir = require('./util/find-dir');

const MIGRATIONS_PATH = findDir(
  config.migrations.path || 'migrations',
) || 'migrations';

const DATABASE_URL = process.env[config.vars.database_url];
const REGEX_DATABASE_URL = new RegExp(
  '^postgres://([^:]+):([^@]+)@([^:]+):(\\d+)/(.+)$',
  'i',
);

const explodeUrl = (databaseUrl = DATABASE_URL) => {
  const [
    _full,
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

const combineUrl = ({ user, password, host, port, database }) =>
  `postgres://${user}:${password}@${host}:${port}/${database}`;

const thisDb = () =>
  explodeUrl(DATABASE_URL).database;

const thisUrl = () =>
  DATABASE_URL;

const createSuperPostgresEnv = (databaseUrl = DATABASE_URL) => {
  const { user, password, host, port } = explodeUrl(databaseUrl);
  return {
    PGUSER: process.env[config.vars.super_user] || user,
    PGPASSWORD: process.env[config.vars.super_password] || password,
    PGHOST: host,
    PGPORT: port,
  };
};

const connect = (extraOptions = {}) =>
  knex({
    client: 'pg',
    connection: explodeUrl(DATABASE_URL),
    ...extraOptions,    
  });

const connectAsSuper = (extraOptions = {}) =>
  knex({
    client: 'pg',
    connection: {
      ...explodeUrl(DATABASE_URL),
      user: process.env[config.vars.super_user],
      password: process.env[config.vars.super_password],
    },
    ...extraOptions,
  });

const modifyUrl = (modifications, databaseUrl = DATABASE_URL) =>
  combineUrl({
    ...explodeUrl(databaseUrl),
    ...modifications,
  });

const databaseNames = async () => {
  const knex = connectAsSuper();
  return knex.raw(`
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
  const oldUrl = DATABASE_URL;
  const newUrl = modifyUrl({ database }, oldUrl);
  return replaceEnv(
    config.vars.database_url,
    oldUrl,
    newUrl,
  );
};

const getMigrationsPath = () => MIGRATIONS_PATH;

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
