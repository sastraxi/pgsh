const c = require('ansi-colors');
const { prompt } = require('enquirer');
const mergeOptions = require('merge-options');

const readMigrations = require('../util/read-migrations');

module.exports = (db) => {
  const { config } = db;
  const defaultOptions = {
    template: db.config.template || 'template1',
    migrate: undefined,
    yargs: undefined,
    switch: true,
  };

  return async (name, options) => {
    const opts = mergeOptions(defaultOptions, options || {});

    const current = db.thisUrl();
    const knexFallback = db.connectAsSuper(db.fallbackUrl());
    await knexFallback.raw(`
      create database "${name}"
      template ${opts.template}
    `);
    if (opts.switch) {
      db.switchTo(name);
      console.log(`Done! Switched to ${name}.`);
    }

    let shouldMigrate = false;
    if (config.migrations && opts.migrate === undefined) {
      // only show the prompt if we have some migrations in the folder.
      const migrationFiles = readMigrations(db.getMigrationsPath());
      if (migrationFiles.length > 0) {
        shouldMigrate = (await prompt({
          type: 'toggle',
          name: 'migrate',
          message: 'Migrate this database to the latest version?',
        })).migrate;
      }
    }

    if (config.migrations && shouldMigrate) {
      const printLatest = require('../util/print-latest-migration')(opts.yargs);
      try {
        // TODO: DRY with "up" command
        const knex = db.connect();
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
        if (opts.switch) {
          console.log(
            `Switching back to ${c.yellowBright(current)}`
            + ' and dropping the new database...',
          );
          db.switchTo(current);
        }
        await knexFallback.raw(`drop database "${name}"`);
        console.log('Done.');
        throw new Error('Migration failed; database dropped.');
      }
    }

    return name;
  };
};
