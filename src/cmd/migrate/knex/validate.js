const debug = require('debug')('pgsh:validate');
const config = require('../../../config');
const readMigrations = require('../../../util/read-migrations');

exports.command = 'validate';
exports.desc = '(knex) validates the current database against the migration directory';

exports.builder = yargs => yargs;

const getAppliedMigrations = async (knex) => {
  const SCHEMA = config.migrations.schema || 'public';
  const TABLE = config.migrations.table || 'knex_migrations';
  try {
    const filenames = await knex(`${SCHEMA}.${TABLE}`)
      .orderBy('id', 'desc')
      .select('name')
      .map(r => r.name);

    return filenames;
  } catch (err) {
    debug('could not list applied migrations', err);
    return [];
  }
};

exports.handler = async (yargs) => {
  const db = require('../../../db')();
  const printLatest = require('../../../util/print-latest-migration')(db, yargs);
  try {
    const knex = db.connect();
    const migrationsPath = db.getMigrationsPath();
    const applied = await getAppliedMigrations(knex);
    const available = readMigrations(migrationsPath)
      .map(m => m.name);

    const missing = applied.filter(name => available.indexOf(name) === -1);
    const unapplied = available.filter(name => applied.indexOf(name) === -1);

    await printLatest();

    if (!missing.length && !unapplied.length) {
      process.exit(0);
    }

    if (missing.length) {
      console.log(`The following applied migrations are missing from ${migrationsPath}`);
      console.log(missing);
    }

    if (unapplied.length) {
      console.log(`The following migrations in ${migrationsPath} have not been applied:`);
      console.log(unapplied);
    }

    process.exit(1);
  } catch (err) {
    debug(err.message); // knex already prints out the error, so don't repeat unless we ask
    process.exit(2);
  }
};
