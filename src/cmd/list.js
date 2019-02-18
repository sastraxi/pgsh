const Bluebird = require('bluebird');
const chalk = require('chalk');
const moment = require('moment');
const config = require('../config');
const db = require('../db');

const printTable = require('../util/print-table');

exports.command = 'list [prefix]';
exports.desc = 'prints all databases, filtered by an optional prefix';

exports.builder = yargs => yargs
  .positional('prefix', {
    describe: 'only list databases that start with the given string',
    type: 'string',
    default: config.prefix ? `${config.prefix}_` : '',
  });

const IGNORE_DATABASES = ['postgres'];
const SCHEMA = config.migrations.schema || 'public';
const TABLE = config.migrations.table || 'knex_migrations';

const migrationOutput = async (knex, isPrimary) => {
  try {
    const latest = await knex(`${SCHEMA}.${TABLE}`)
      .orderBy('id', 'desc')
      .first('name', 'migration_time');

    const filename = isPrimary
      ? chalk.greenBright(chalk.underline(latest.name))
      : chalk.underline(latest.name);

    const reltime = chalk.blueBright(moment(latest.migration_time).fromNow());

    return [filename, reltime];
  } catch (err) {
    return [];
  }
};

exports.handler = async (yargs) => {
  const { prefix, verbose } = yargs;

  const databaseNames = await db.databaseNames();
  const current = db.thisDb();

  const rows = await Bluebird.map(
    databaseNames
      .filter(x => !IGNORE_DATABASES.includes(x))
      .filter(x => !prefix || x.startsWith(prefix))
      .sort(),

    async (name) => {
      let migration = [];
      if (config.migrations && verbose) {
        const knex = db.connectAsSuper({}, db.thisUrl(name));
        migration = await migrationOutput(knex, name === current);
      }

      if (name === current) {
        return ['*', `${chalk.yellowBright(name)}`, ...migration];
      }
      return ['', name, ...migration];
    },
  );
  printTable(rows);

  process.exit(0);
};
