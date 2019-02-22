const c = require('ansi-colors');

exports.command = 'clone <target>';
exports.desc = 'clones your current database as target, then switches to it';

exports.builder = yargs => yargs
  .positional('target', {
    describe: 'the name to give the cloned database',
    type: 'string',
  });

exports.handler = async ({ target }) => {
  const db = require('../db')();
  const clone = require('../task/clone')(db);

  const current = db.thisDb();
  if (target === current) {
    console.log(`Cannot clone to ${target}; that's the current database!`);
    return process.exit(1);
  }

  if (await db.isValidDatabase(target)) {
    console.error(`Cannot clone to ${target}; that database already exists!`);
    return process.exit(2);
  }

  console.log(`Going to clone ${current} to ${target}...`);
  try {
    await clone(current, target);
    db.switchTo(target);
    console.log(`Done! Switched to ${target}.`);
    return process.exit(0);
  } catch (err) {
    console.error(
      `Clone failed: ${c.redBright(err.message)}`,
    );
    return process.exit(1);
  }
};
