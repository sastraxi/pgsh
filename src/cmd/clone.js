const { spawn } = require('child_process');
const config = require('../config');

exports.command = 'clone <target>';
exports.desc = 'clones your current database as target, then switches to it';

exports.builder = yargs => yargs
  .positional('target', {
    describe: 'the name to give the cloned database',
    type: 'string',
  });

exports.handler = async ({ target }) => {
  const db = require('../db');

  const current = db.thisDb();
  if (target === current) {
    console.log(`Cannot clone to ${target}; that's the current database!`);
    return process.exit(2);
  }

  console.log(`Going to clone ${current} to ${target}...`);

  const knex = db.connectAsSuper();
  await knex.raw(`
    create database ${target}
    template ${config.template || 'template1'}
  `);

  const p = spawn(
    `pg_dump -Fc ${db.thisDb()} | pg_restore -d ${target}`,
    {
      shell: true,
      env: db.createSuperPostgresEnv(),
    },
  );

  return p.on('exit', (code, signal) => {
    if (code === 0) {
      db.switchTo(target);
      console.log(`Done! Switched to ${target}.`);
    } else {
      console.error(
        `Clone failed (code ${code}, signal ${signal})`,
      );
    }
    process.exit(code);
  });
};
