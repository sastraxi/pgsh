const c = require('ansi-colors');
const moment = require('moment');
const Bluebird = require('bluebird');

const config = require('../config');

const printTable = require('../util/print-table');

exports.command = ['list [prefix]', 'ls', 'l'];
exports.desc = 'prints all databases, filtered by an optional prefix';

exports.builder = yargs => yargs
  .positional('prefix', {
    describe: 'only list databases that start with the given string',
    type: 'string',
    default: config.prefix ? `${config.prefix}_` : '',
  })
  .option('c', {
    alias: 'created',
    type: 'boolean',
    describe: 'order databse lists by creation time descending',
    default: false,
  });

const IGNORE_DATABASES = ['postgres'];

const migrationOutput = async (knex, isPrimary) => {
  const SCHEMA = config.migrations.schema || 'public';
  const TABLE = config.migrations.table || 'knex_migrations';
  try {
    const latest = await knex(`${SCHEMA}.${TABLE}`)
      .orderBy('id', 'desc')
      .first('name', 'migration_time');

    const filename = isPrimary
      ? c.greenBright(c.underline(latest.name))
      : c.underline(latest.name);

    const reltime = c.blueBright(moment(latest.migration_time).fromNow());

    return [filename, reltime];
  } catch (err) {
    return [];
  }
};

exports.handler = async (yargs) => {
  const db = require('../db')();
  const { prefix, verbose: explictlyVerbose, created } = yargs;
  const showMigrations = explictlyVerbose !== undefined ? explictlyVerbose : !!db.config.migrations;

  try {
    const current = db.thisDb();
    const databaseNames = await db.databaseNames({
      showTemplates: false,
      sortByCreation: created || false,
    });

    const rows = await Bluebird.map(
      databaseNames
        .filter(x => !IGNORE_DATABASES.includes(x))
        .filter(x => !prefix || x.startsWith(prefix)),

      async (name) => {
        let migration = [];
        if (showMigrations) {
          const knex = db.connectAsSuper(db.thisUrl(name));
          migration = await migrationOutput(knex, name === current);
        }

        if (name === current) {
          return ['*', `${c.yellowBright(name)}`, ...migration];
        }
        return ['', name, ...migration];
      },
    );
    printTable(rows);

    process.exit(0);
  } catch (err) {
    const { message } = err;
    console.error(`postgres: ${c.redBright(message)}`);
    process.exit(1);
  }
};
