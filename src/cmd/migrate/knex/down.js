const c = require('ansi-colors');
const debug = require('debug')('pgsh:knex:down');

const readMigrations = require('./util/read-migrations');
const getAppliedMigrations = require('./util/get-applied-migrations');
const deleteMigration = require('./util/delete-migration');
const chooseMigrationIndex = require('./util/choose-migration-index');

exports.command = 'down <ver>';
exports.desc = '(knex) down-migrates the current database to the given migration';

exports.builder = yargs =>
  yargs
    .positional('ver', {
      describe: 'the migration to migrate down to',
      type: 'number',
    });

exports.handler = async (yargs) => {
  const db = require('../../../db')();
  const printLatest = require('./util/print-latest-migration')(db, yargs);
  const { ver: userInput } = yargs;

  // grab the migrations from the file system (under some VCS)
  const migrationsPath = db.getMigrationsPath();
  const vcsMigrations = readMigrations(migrationsPath);
  if (!vcsMigrations.length) {
    console.error(
      'your migrations folder is empty',
      `(${c.underline(`${db.getMigrationsPath()}/`)})!`,
    );
    process.exit(1);
  }

  // determine which migration the user's talking about
  const destVcsIndex = chooseMigrationIndex(db)(vcsMigrations, userInput);

  // grab the set of migrations already recorded in the database
  const knex = db.connect();
  const appliedMigrations = await getAppliedMigrations(knex);

  /* eslint-disable import/no-dynamic-require */
  /* eslint-disable no-await-in-loop */
  for (
    // start from the lexicographically highest-prefixed migration on disk
    // and go down to the ID of the migration we want to be at.
    let i = vcsMigrations.findIndex(m => m.name === appliedMigrations[0].name);
    i > destVcsIndex;
    i -= 1
  ) {
    // match it with a migration on the filesystem
    const thisDbMigration = appliedMigrations.find(m => m.name === vcsMigrations[i].name);
    if (!thisDbMigration) {
      console.error(
        `Trying to cascade deletion but migration ${c.redBright(vcsMigrations[i].name)} `
          + 'could not be found in the database! Exiting.',
      );
      process.exit(1);
    }

    // execute the migration in our database and record it in the knex migrations table
    const { name, fullPath } = vcsMigrations[i];
    const { down: runDownMigration } = require(fullPath);
    try {
      await runDownMigration(knex);
      await deleteMigration(knex, thisDbMigration.id);
      console.log(`↓ ${c.redBright(name)}`);
    } catch (err) {
      console.error(`something went wrong running down from: ${fullPath}`);
      console.error(err);
    }
  }
  /* eslint-enable no-await-in-loop  */
  /* eslint-enable import/no-dynamic-require */

  // close our database connection
  await printLatest();
  return new Promise(resolve =>
    knex.destroy(() => {
      debug(`Down-migration to <${userInput}> finished!`);
      resolve();
    }));
};
