const c = require('ansi-colors');

const debug = require('debug')('pgsh:validate');
const getAppliedMigrations = require('./util/get-applied-migrations');
const readMigrations = require('./util/read-migrations');

const { set: setCommandLine } = require('../../../metrics/command-line');
const endProgram = require('../../../end-program');

exports.command = ['validate', 'status'];
exports.desc = '(knex) validates the current database against the migration directory';

exports.builder = yargs => yargs;

exports.handler = async (yargs) => {
  const db = require('../../../db')();
  const printLatest = require('./util/print-latest-migration')(db, yargs);
  setCommandLine();

  try {
    const knex = db.connect();
    const migrationsPath = db.getMigrationsPath();
    const applied = await getAppliedMigrations(knex);
    const available = readMigrations(migrationsPath)
      .map(m => m.name);

    const missing = applied
      .map(m => m.name)
      .filter(name => available.indexOf(name) === -1)
      .map(c.redBright);

    const unapplied = available
      .filter(name => applied.findIndex(f => f.name === name) === -1)
      .map(c.yellowBright);

    await printLatest();

    if (!missing.length && !unapplied.length) {
      endProgram(0);
    }

    if (missing.length) {
      console.log('\nMissing from filesystem:');
      missing.forEach(name => console.log(` ❌ ${c.redBright(c.underline(name))}`));
    }

    if (unapplied.length) {
      console.log('\nNot yet applied:');
      unapplied.forEach(u => console.log(` ? ${c.underline(u)}`));
    }

    if (missing.length) return endProgram(1);
    return endProgram(0);
  } catch (err) {
    debug(err.message); // knex already prints out the error, so don't repeat unless we ask
    return endProgram(2);
  }
};
