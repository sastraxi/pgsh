const config = require('../../config');
const db = require('../../db');

exports.command = 'up';
exports.desc = '(knex) migrates the current database to the latest version found in your migration directory';

exports.builder = {};

exports.handler = async () => {
  const migrations = {
    tableName: config.migrations.table,
    schemaName: config.migrations.schema || undefined,
  };

  const migrationsPath = db.getMigrationsPath();
  if (migrationsPath) {
    migrations.directory = migrationsPath;
  }

  const knex = db.connect({ migrations });
  knex.migrate.latest().then(
    (...args) => {
      console.log('Migrated!', args);
      process.exit(0);
    },
    (err) => {
      console.error('Knex migration failed', err);
      process.exit(1);
    }
  );  
};
