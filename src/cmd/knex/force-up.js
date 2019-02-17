const fs = require('fs');
const db = require('../../db');
const config = require('../../config');
const confirm = require('../../util/confirm-prompt');

const MIGRATION_FILENAME_REGEX = new RegExp(
  '0*(\\d+)_.+',
  'i',
);

exports.command = 'force-up';
exports.desc = 're-writes the knex migrations table entirely based on your migration directory';

exports.builder = {};

exports.handler = async () => {
  const migrationsPath = db.getMigrationsPath();
  if (!fs.existsSync(migrationsPath)) {
    console.error(`The migrations folder ${migrationsPath} does not exist!`);
    return process.exit(1);
  }

  const migrations = fs.readdirSync(migrationsPath).map((filename) => {
    const match = MIGRATION_FILENAME_REGEX.exec(filename);
    if (!match) {
      return console.warn(`Skipping non-migration ${filename}`);
    }
    const [_full, textualNumber] = match;
    return {
      id: +textualNumber,
      name: filename,
    };
  });

  const highestNumber = migrations
    .map(migration => migration.id)
    .reduce((a, b) => Math.max(a, b), 0);

  console.log(`This will re-write the knex_migrations table based on ${migrationsPath}`);
  console.log('Use of this tool implies that the database has been migrated fully!\n');
  
  try {
    await confirm('Type the number of the highest migration to continue: ', `${highestNumber}`);
  } catch (err) {
    console.log('Not re-writing the migrations table.');
    return process.exit(2);
  }

  migrations.sort((a, b) => a.id - b.id);
  const knex = db.connectAsSuper();
  const schema = config.migrations.schema || 'public';
  const table = config.migrations.table || 'knex_migrations';

  await knex(`${schema}.${table}`).del();
  await knex(`${schema}.${table}`)
    .insert(migrations.map(migration => ({
      name: migration.name,
      batch: 1,
      migration_time: knex.fn.now(),
    })));

  process.exit(0);
};
