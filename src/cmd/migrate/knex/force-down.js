const c = require('ansi-colors');
const moment = require('moment');

const getAppliedMigrations = require('./util/get-applied-migrations');
const chooseMigrationIndex = require('./util/choose-migration-index');

const confirm = require('../../../util/confirm-prompt');
const printTable = require('../../../util/print-table');

exports.command = 'force-down <ver>';
exports.desc = 're-writes the `knex_migrations` table to not include the record of any migration past the given version.';

exports.builder = yargs =>
  yargs
    .positional('ver', {
      describe: 'the migration number to migrate down to',
      type: 'string',
    });

exports.handler = async (yargs) => {
  const db = require('../../../db')();
  const { ver: userInput, iso } = yargs;
  const printLatest = require('./util/print-latest-migration')(db, yargs);
  const timestamp = raw => (iso
    ? moment(raw).format()
    : moment(raw).fromNow()
  );

  const knex = db.connectAsSuper(); // FIXME: do we need super privileges here?
  const SCHEMA = db.config.migrations.schema || 'public';
  const TABLE = db.config.migrations.table || 'knex_migrations';

  // determine which migration the user's talking about
  const appliedMigrations = await getAppliedMigrations(knex); // from db
  const idx = await chooseMigrationIndex(db)(
    appliedMigrations.map(m => m.name), userInput,
  );
  const prefix = appliedMigrations[idx].name.split('_')[0];

  let migrationsToDelete;
  try {
    migrationsToDelete = await knex.raw(`
      select
        name,
        migration_time::text as migratedAt
      from ${SCHEMA}.${TABLE}
      where split_part(name, '_', 1) > ?
    `, [prefix]).then(({ rows }) => rows);
  } catch (err) {
    const { message } = err;
    console.error(`postgres: ${c.redBright(message)}`);
    process.exit(1);
  }

  if (!migrationsToDelete.length) {
    console.error(
      'No migrations to forget! This usually means',
      'your database is <= the given version.',
    );
    return process.exit(2);
  }

  console.log(`This will forceably downgrade your database to ${prefix}`);
  console.log('After doing this, you should manually downgrade the actual database data / schema.\n');
  console.log('The following migrations will be forgotten:');
  const rows = migrationsToDelete.map(({ name, migratedAt }) => ([
    '*',
    `${c.greenBright(timestamp(migratedAt))}`,
    `${c.redBright(name)}`,
  ]));
  printTable(rows);

  console.log(
    '\nIf the above migrations exist in the directory,',
    'you can use down instead of force-down.',
  );

  try {
    await confirm('Otherwise, type the target prefix again to execute: ', `${prefix}`);
  } catch (err) {
    console.error('Not downgrading.');
    return process.exit(2);
  }

  console.log(`\nSetting database to ${prefix}...`);
  await knex.raw(`
    delete from ${SCHEMA}.${TABLE}
    where split_part(name, '_', 1) > ?
  `, [prefix]);

  await printLatest();
  return process.exit(0);
};
