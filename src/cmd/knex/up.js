const c = require('ansi-colors');
const config = require('../../config');

exports.command = 'up';
exports.desc = '(knex) migrates the current database to the latest version found in your migration directory';

exports.builder = yargs => yargs;

exports.handler = async (yargs) => {
  const db = require('../../db');
  const printLatest = require('../../util/print-latest-migration')(yargs); // TODO: use middleware

  const schema = config.migrations.schema || 'public';
  const table = config.migrations.table || 'knex_migrations';
  const migrations = { schemaName: schema, tableName: table };

  const migrationsPath = db.getMigrationsPath();
  if (migrationsPath) {
    migrations.directory = migrationsPath;
  }

  try {
    const knex = db.connect({ migrations });
    const [batch, filenames] = await knex.migrate.latest();
    if (filenames.length > 0) {
      console.log(`Migration batch #${batch} applied!`);
      filenames.forEach(filename =>
        console.log(`↑ ${c.yellowBright(filename)}`));
      console.log();
    }

    await printLatest(knex);

    process.exit(0);
  } catch (err) {
    console.error('Knex migration failed', err);
    process.exit(1);
  }
};
