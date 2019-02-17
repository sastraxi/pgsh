const confirm = require('../confirm-prompt');
const db = require('../db');
const config = require('../config');

exports.command = 'destroy <target>';
exports.desc = 'Destroys the given database. This cannot be undone!';

exports.builder = yargs =>
  yargs
    .positional('target', {
      describe: 'The database to drop. You can maintain a blacklist ' +
        'of databases to protect from this command in your .pgshrc',
      type: 'string',
    })

exports.handler = async function ({ target }) {
  const current = db.thisDb();
  if (target === current) {
    console.log(`Cannot destroy ${target}; that's the current database!`);
    return process.exit(1);
  }

  if (config.protected &&
      config.protected
        .map(x => x.toLowerCase())
        .includes(target.toLowerCase()))
  {
    console.error(`Cannot drop ${target} (protected by your .pgshrc)`);
    return process.exit(2);
  }
  
  if (!(await db.isValidDatabase(target))) {
    console.error(`${target} is not a valid database.`);
    return process.exit(3);
  }

  try {
    await confirm("Type the database name to drop it: ", target);  
  } catch (err) {
    console.log('Not dropping.');
    return process.exit(0);
  }

  console.log(`Dropping ${target}...`);
  const knex = db.connectAsSuper();``
  await knex.raw(`drop database ${target};`);
  process.exit(0);
};
