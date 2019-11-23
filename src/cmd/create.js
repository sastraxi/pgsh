const c = require('ansi-colors');

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
  })
  .option('S', {
    alias: 'no-switch',
    type: 'boolean',
    describe: 'do not switch to the newly-created database',
    default: undefined,
  });

exports.handler = async ({
  name,
  migrate,
  switch: shouldSwitch, // --no-switch
  S: dontSwitch,        // -S
  ...yargs
}) => {
  const db = require('../db')();
  const create = require('../task/create')(db);

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
  try {
    await create(name, {
      migrate,
      yargs,
      switch: shouldSwitch !== undefined ? shouldSwitch : !dontSwitch, // TODO: coalesce
    });

    return process.exit(0);
  } catch (err) {
    console.error(`could not create: ${c.redBright(err.message)}`);
    return process.exit(3);
  }
};
