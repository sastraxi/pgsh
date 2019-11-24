const c = require('ansi-colors');
const moment = require('moment');

const config = require('../config');

exports.command = ['status'];
exports.desc = 'shows the current database, its migration status, and a comparison to the checked-out migration folder';

exports.builder = yargs => yargs;

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
  const { verbose: explictlyVerbose } = yargs;
  const showMigrations = explictlyVerbose !== undefined ? explictlyVerbose : !!db.config.migrations;

  try {
    const name = db.thisDb();
    let migration = [];
    if (showMigrations) {
      const knex = db.connectAsSuper(db.thisUrl(name));
      migration = await migrationOutput(knex, true);
    }

    console.log(`* ${c.yellowBright(name)} ${migration.join(' ')}`);
    process.exit(0);
  } catch (err) {
    const { message } = err;
    console.error(`postgres: ${c.redBright(message)}`);
    process.exit(1);
  }
};
