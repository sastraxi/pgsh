const c = require('ansi-colors');

const confirm = require('../util/confirm-prompt');
const waitFor = require('../util/wait-for');

const { set: setCommandLine } = require('../metrics/command-line');
const endProgram = require('../end-program');

exports.command = ['destroy <target>', 'drop', 'rm'];
exports.desc = 'Destroys the given database. This cannot be undone!';

exports.builder = yargs =>
  yargs
    .positional('target', {
      describe: 'The database to drop. You can maintain a blacklist '
        + 'of databases to protect from this command in your .pgshrc',
      type: 'string',
    })
    .option('f', {
      alias: 'fail-fast',
      type: 'boolean',
      describe: 'Do not wait for the database to be unused; exit immediately',
      default: false,
    });

exports.handler = async ({ target, failFast }) => {
  const db = require('../db')();
  setCommandLine(target);

  const current = db.thisDb();
  if (target === current) {
    console.log(`Cannot destroy ${target}; that's the current database!`);
    return endProgram(1);
  }

  if (db.config.protected
    && db.config.protected
      .map(x => x.toLowerCase())
      .includes(target.toLowerCase())) {
    console.error(`Cannot drop ${target} (protected by your .pgshrc)`);
    return endProgram(2);
  }

  if (!(await db.isValidDatabase(target))) {
    console.error(`${target} is not a valid database.`);
    return endProgram(3);
  }

  const interruptHandler = () => {
    console.log(`\nDid not drop ${target}!`);
    return endProgram(0);
  };

  try {
    await waitFor(db, target, interruptHandler, failFast);
    await confirm(c.redBright('Type the database name to drop it: '), target);
    await waitFor(db, target, interruptHandler, failFast);
  } catch (err) {
    console.log('Not dropping.');
    return endProgram(0);
  }

  try {
    console.log(`Dropping ${target}...`);
    const knex = db.connectAsSuper(db.fallbackUrl()); // createdb
    await knex.raw(`drop database "${target}"`);
    return endProgram(0);
  } catch (err) {
    console.error(`Could not drop ${target}!`);
    console.error(err);
    return endProgram(4);
  }
};
