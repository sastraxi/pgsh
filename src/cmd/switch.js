exports.command = 'switch <target>';
exports.desc = 'makes target your current database, changing the connection string';

exports.builder = yargs => yargs
  .positional('target', {
    describe: 'the database to switch to',
    type: 'string',
  })
  .option('f', {
    alias: 'force',
    type: 'boolean',
    describe: 'switch even if the target does not exist',
    default: false,
  });

exports.handler = async ({ target, force }) => {
  const db = require('../db')();

  if (!force && !(await db.isValidDatabase(target))) {
    console.error(`${target} is not a valid database.`);
    return process.exit(2);
  }

  const current = db.thisDb();
  if (target === current) {
    console.log(`Cannot switch to ${target}; that's the current database!`);
    return process.exit(2);
  }

  console.log(`Switching to ${target}...`);
  db.switchTo(target);
  console.log('Done!');
  return process.exit(0);
};
