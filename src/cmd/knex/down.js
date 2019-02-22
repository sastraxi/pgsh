const c = require('ansi-colors');
const { spawn } = require('child_process');
const readMigrations = require('../../util/read-migrations');

exports.command = 'down <ver>';
exports.desc = '(knex) down-migrates the current database to the given version. delegates to knex-migrate';

exports.builder = yargs =>
  yargs
    .positional('ver', {
      describe: 'the migration number to migrate down to',
      type: 'number',
    });

exports.handler = async (yargs) => {
  const db = require('../../db')();
  const createKnexfile = require('../../util/create-knexfile');
  const printLatest = require('../../util/print-latest-migration')(yargs); // TODO: use middleware

  const { ver: version } = yargs;

  const knexfilePath = createKnexfile();
  const migrationsPath = db.getMigrationsPath();
  const migrations = readMigrations(migrationsPath);
  if (!migrations.length) {
    console.error(
      'your migrations folder is empty',
      `(${c.underline(`${db.getMigrationsPath()}/`)})!`,
    );
    process.exit(1);
  }

  const soughtMigration = migrations.find(m => m.id === version);
  if (!soughtMigration) {
    console.error(
      `couldn't find migration #${version};`,
      'check your migrations folder',
      `(${c.underline(`${db.getMigrationsPath()}/`)})`,
    );
    process.exit(2);
  }

  const command = 'knex-migrate down'
    + ` --cwd ${process.cwd()}`
    + ` --to ${soughtMigration.prefix}`
    + ` --knexfile ${knexfilePath}`
    + ` --migrations ${migrationsPath}`;

  console.log(command);
  const p = spawn(command, {
    shell: true,
    stdio: 'inherit',
  });
  p.on('exit', async (code, signal) => {
    if (code !== 0) {
      console.error(`child process exited with code ${code} and signal ${signal}`);
    } else {
      console.log('Done!\n');
    }

    const knex = db.connectAsSuper();
    await printLatest(knex);
    process.exit(code);
  });
};
