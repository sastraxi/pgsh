const c = require('ansi-colors');
const moment = require('moment');

const config = require('../../config');
const confirm = require('../../util/confirm-prompt');
const printTable = require('../../util/print-table');

exports.command = 'force-down <ver>';
exports.desc = 're-writes the `knex_migrations` table to not include the record of any migration past the given version.';

exports.builder = yargs =>
  yargs
    .positional('ver', {
      describe: 'the migration number to migrate down to',
      type: 'number',
    });

exports.handler = async (yargs) => {
  const db = require('../../db');
  const { ver: version, iso } = yargs;
  const printLatest = require('../../util/print-latest-migration')(yargs); // TODO: use middleware
  const timestamp = raw => (iso
    ? moment(raw).format()
    : moment(raw).fromNow()
  );

  const schema = config.migrations.schema || 'public';
  const table = config.migrations.table || 'knex_migrations';

  const knex = db.connectAsSuper();
  let migrationsToDelete;
  try {
    migrationsToDelete = await knex.raw(`
      select
        name,
        migration_time::text as migratedAt
      from ${schema}.${table}
      where split_part(name, '_', 1)::int > ?
    `, [version]).then(({ rows }) => rows);
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

  console.log(`This will forceably downgrade your database to version ${version}`);
  console.log('After doing this, you should manually downgrade the actual database data / schema.\n');
  console.log('The following migrations will be forgotten:');
  const rows = migrationsToDelete.map(({ name, migratedAt }) => ([
    '*',
    `${c.greenBright(timestamp(migratedAt))}`,
    `${c.redBright(name)}`,
  ]));
  printTable(rows);

  console.log();
  console.log(
    'If the above migrations exist in the directory,',
    'you can use down instead of force-down.',
  );

  try {
    await confirm('Otherwise, type the target version again to execute: ', `${version}`);
  } catch (err) {
    console.error('Not downgrading.');
    return process.exit(2);
  }

  console.log(`\nSetting database to ${version}...`);

  await knex.raw(`
    delete from ${schema}.${table}
    where split_part(name, '_', 1)::int > ?
  `, [version]);

  console.log('Done!\n');

  await printLatest(knex);

  return process.exit(0);
};
