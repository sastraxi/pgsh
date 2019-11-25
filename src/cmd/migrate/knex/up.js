const c = require('ansi-colors');
const debug = require('debug')('pgsh:up');

exports.command = 'up';
exports.desc = '(knex) migrates the current database to the latest version found in your migration directory';

exports.builder = yargs => yargs;

exports.handler = async (yargs) => {
  const db = require('../../../db')();
  const printLatest = require('./util/print-latest-migration')(db, yargs);

  try {
    const knex = db.connect();
    const [batch, filenames] = await knex.migrate.latest();
    if (filenames.length > 0) {
      debug(`migration batch #${batch} => ${filenames}`);
      filenames.forEach(filename =>
        console.log(`↑ ${c.yellowBright(filename)}`));
    }

    await printLatest();
    process.exit(0);
  } catch (err) {
    console.error('migrate failed.');
    debug(err.message); // knex already prints out the error, so don't repeat unless we ask
    process.exit(1);
  }
};
