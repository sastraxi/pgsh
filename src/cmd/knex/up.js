const c = require('ansi-colors');

exports.command = 'up';
exports.desc = '(knex) migrates the current database to the latest version found in your migration directory';

exports.builder = yargs => yargs;

exports.handler = async (yargs) => {
  const db = require('../../db')();
  const printLatest = require('../../util/print-latest-migration')(db, yargs);

  try {
    const knex = db.connect();
    const [batch, filenames] = await knex.migrate.latest();
    if (filenames.length > 0) {
      console.log(`Migration batch #${batch} applied!`);
      filenames.forEach(filename =>
        console.log(`↑ ${c.yellowBright(filename)}`));
      console.log();
    }

    await printLatest();

    process.exit(0);
  } catch (err) {
    console.error(`migrate failed: ${c.redBright(err.message)}`);
    process.exit(1);
  }
};
