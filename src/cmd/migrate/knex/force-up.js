const c = require('ansi-colors');

const { set: setCommandLine } = require('../../../metrics/command-line');
const endProgram = require('../../../end-program');

const confirm = require('../../../util/confirm-prompt');
const readMigrations = require('./util/read-migrations');

exports.command = 'force-up';
exports.desc = 're-writes the knex migrations table entirely based on your migration directory';

exports.builder = {};

exports.handler = async (yargs) => {
  const db = require('../../../db')();
  const printLatest = require('./util/print-latest-migration')(db, yargs);
  setCommandLine();

  const schema = db.config.migrations.schema || 'public';
  const table = db.config.migrations.table || 'knex_migrations';

  const migrationsPath = db.getMigrationsPath();
  const migrations = readMigrations(migrationsPath);
  if (!migrations.length) {
    console.error(
      'your migrations folder is empty',
      `(${c.underline(`${db.getMigrationsPath()}/`)})!`,
    );
    endProgram(1);
  }

  const highestPrefix = migrations
    .map(migration => migration.prefix)
    .reduce((a, b) => {
      if (!a) return b;
      if (!b) return a;
      if (a.localeCompare(b) >= 0) return a;
      return b;
    });

  console.log(`This will re-write the knex_migrations table based on ${migrationsPath}`);
  console.log(
    c.redBright('Use of this tool implies that the database has been migrated fully!\n'),
  );

  try {
    await confirm('Type the prefix of the highest migration to continue: ', `${highestPrefix}`);
  } catch (err) {
    console.log('Not re-writing the migrations table.');
    return endProgram(2);
  }

  const knex = db.connectAsSuper(); // FIXME: do we need super privileges here?

  // sort migrations by ascending prefix
  migrations.sort((a, b) => a.prefix.localeCompare(b.prefix));

  await knex(`${schema}.${table}`).del();
  await knex(`${schema}.${table}`)
    .insert(migrations.map(migration => ({
      name: migration.name,
      batch: 1,
      migration_time: knex.fn.now(),
    })));

  console.log('Migrations table re-written!\n');
  await printLatest();

  return endProgram(0);
};
