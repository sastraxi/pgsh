const c = require('ansi-colors');
const { prompt } = require('enquirer');

const clone = require('./clone');
const create = require('./create');
const config = require('../config');

const CHOICES = [
  {
    value: 'switch',
    message: 'Connect to an existing database',
  },
  {
    value: 'clone',
    message: 'Clone an existing database',
  },
  {
    value: 'create',
    message: 'Create a new database',
  },
];

const KEEP_CHOICE = {
  value: 'keep',
  message: 'Keep as-is',
};

const pick = async (db, message = 'Which database?', showTemplates = false) => {
  const names = await db.databaseNames(showTemplates);
  const { name } = await prompt({
    type: 'select',
    name: 'name',
    message,
    choices: names.sort(),
  });
  return name;
};

const dispatch = {
  keep:
    db => ({ database: db.thisDb() }),

  switch:
    async (db) => {
      const database = await pick(db, 'Connect to which database?');
      return { database };
    },

  clone:
    async (db) => {
      const { target } = await prompt({
        type: 'input',
        name: 'target',
        message: 'What should the new database be called?',
      });
      const source = await pick(db, 'Which database do you want to clone?');

      console.log();
      console.log(
        `Going to clone ${c.yellowBright(source)} to ${c.yellowBright(target)}...`,
      );
      await clone(db)(source, target);
      console.log('Done!');

      return { database: target };
    },

  create:
    async (db) => {
      const { pickTemplate } = await prompt({
        type: 'toggle',
        name: 'pickTemplate',
        message:
          `${c.bold('Do you need to change the template database?')}`
            + ` (default ${c.yellowBright(config.template)})`,
      });

      const template = pickTemplate
        ? await pick(db, 'Which template do you want to use?', true)
        : config.template;

      const { name } = await prompt({
        type: 'input',
        name: 'name',
        message: 'What should the new database be called?',
      });

      console.log();
      console.log(`Going to create ${c.yellowBright(name)}...`);
      await create(db)(name, { template, switch: false });
      console.log('Done!');

      return {
        database: name,
        config: { template },
      };
    },
};

/**
 * Pass in the current database value rather than get it from the config
 * because we're probably in "knex init" and we don't have the env loaded.
 *
 * @returns { database, config } the database we've switched to and any config changes
 */
module.exports = db => async (currentDatabase) => {
  if (currentDatabase) {
    console.log(
      `Your environment currently points to ${c.yellowBright(currentDatabase)}.`,
    );
    console.log();
  }

  const { mode } = await prompt(
    {
      name: 'mode',
      type: 'select',
      message: 'What would you like to do?',
      choices: [
        ...(currentDatabase ? [KEEP_CHOICE] : []),
        ...CHOICES,
      ],
    },
  );

  return dispatch[mode](db);
};
