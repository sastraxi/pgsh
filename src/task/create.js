const c = require('ansi-colors');
const { prompt } = require('enquirer');
const mergeOptions = require('merge-options');

const readMigrations = require('../cmd/migrate/knex/util/read-migrations');

module.exports = (db) => {
  const { config } = db;
  const defaultOptions = {
    template: db.config.template,
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
    } else {
      console.log(`Done! created ${name}.`);
    }

    let shouldMigrate = opts.migrate || false;
    if (config.migrations && opts.migrate === undefined) {
      // only show the prompt if we have some migrations in the folder.
      const migrationFiles = readMigrations(db.getMigrationsPath());
      if (migrationFiles.length > 0) {
        const response = await prompt({
          type: 'toggle',
          name: 'migrate',
          message: 'Migrate this database to the latest version?',
        });
        shouldMigrate = response.migrate;
      }
    }

    if (config.migrations && shouldMigrate) {
      const printLatest = require('../cmd/migrate/knex/util/print-latest-migration')(db, {
        ...opts.yargs,
        name,
      });
      try {
        // TODO: DRY with "up" command
        const knex = db.connect(db.thisUrl(name));
        const [batch, filenames] = await knex.migrate.latest();

        if (filenames.length > 0) {
          console.log(`Migration batch #${batch} applied!`);
          filenames.forEach(filename =>
            console.log(`↑ ${c.yellowBright(filename)}`));
          console.log();
        }
      } catch (err) {
        console.error(c.redBright('Knex migration failed:'), err);
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
      await printLatest();
    }

    return name;
  };
};
