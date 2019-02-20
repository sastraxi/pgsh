const c = require('ansi-colors');
const { prompt } = require('enquirer');
const config = require('../config');

exports.command = 'create <name>';
exports.desc = 'creates a new database as name, then switches to it';

exports.builder = yargs => yargs
  .positional('name', {
    describe: 'the name to give the new database',
    type: 'string',
  })
  .option('m', {
    alias: 'migrate',
    type: 'boolean',
    describe: 'also migrate the new database to the current version',
    default: undefined,
  });

exports.handler = async ({ name, migrate, ...yargs }) => {
  const db = require('../db');

  const current = db.thisDb();
  if (name === current) {
    console.log(`Cannot create ${name}; that's the current database!`);
    return process.exit(1);
  }

  if (await db.isValidDatabase(name)) {
    console.error(`Cannot create ${name}; that database already exists!`);
    return process.exit(2);
  }

  console.log(`Going to create ${name}...`);
  const knex = db.connectAsSuper();
  await knex.raw(`
    create database ${name}
    template ${config.template || 'template1'}
  `);
  db.switchTo(name);
  console.log(`Done! Switched to ${name}.`);

  let shouldMigrate = migrate;
  if (config.migrations && shouldMigrate === undefined) {
    shouldMigrate = (await prompt({
      type: 'toggle',
      name: 'migrate',
      message: 'Migrate this database to the latest version?',
    })).migrate;
  }

  if (config.migrations && shouldMigrate) {
    // TODO: DRY "up"
    // TODO: use middleware for printLatest
    const printLatest = require('../util/print-latest-migration')(yargs);
    try {
      const [batch, filenames] = await knex.migrate.latest();
      if (filenames.length > 0) {
        console.log(`Migration batch #${batch} applied!`);
        filenames.forEach(filename =>
          console.log(`↑ ${c.yellowBright(filename)}`));
        console.log();
      }
      await printLatest(knex);
    } catch (err) {
      console.error('Knex migration failed (see above).');
      console.log(
        `Switching back to ${c.yellowBright(current)}`
        + ' and dropping the new database...',
      );
      db.switchTo(current);
      await knex.raw(`drop database ${name};`);
      console.log('Done.');
      process.exit(1);
    }
  }

  return process.exit(0);
};
