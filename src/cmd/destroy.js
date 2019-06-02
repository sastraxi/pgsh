const confirm = require('../util/confirm-prompt');

exports.command = ['destroy <target>', 'drop'];
exports.desc = 'Destroys the given database. This cannot be undone!';

exports.builder = yargs =>
  yargs
    .positional('target', {
      describe: 'The database to drop. You can maintain a blacklist '
        + 'of databases to protect from this command in your .pgshrc',
      type: 'string',
    });

exports.handler = async ({ target }) => {
  const db = require('../db')();

  const current = db.thisDb();
  if (target === current) {
    console.log(`Cannot destroy ${target}; that's the current database!`);
    return process.exit(1);
  }

  if (db.config.protected
    && db.config.protected
      .map(x => x.toLowerCase())
      .includes(target.toLowerCase())) {
    console.error(`Cannot drop ${target} (protected by your .pgshrc)`);
    return process.exit(2);
  }

  if (!(await db.isValidDatabase(target))) {
    console.error(`${target} is not a valid database.`);
    return process.exit(3);
  }

  try {
    await confirm('Type the database name to drop it: ', target);
  } catch (err) {
    console.log('Not dropping.');
    return process.exit(0);
  }

  try {
    console.log(`Dropping ${target}...`);
    const knex = db.connectAsSuper(db.fallbackUrl());
    await knex.raw(`drop database "${target}"`);
    return process.exit(0);
  } catch (err) {
    console.error(`Could not drop ${target}!`);
    console.error(err);
    return process.exit(3);
  }
};
