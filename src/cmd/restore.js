const db = require('../db');
const config = require('../config');
const { spawn } = require('child_process');

exports.command = 'restore <target>>';
exports.desc = 'restores a previously-dumped database as target from sql on stdin';

exports.builder = yargs =>
  yargs
    .positional('target', {
      describe: 'the name of the restored database',
      type: 'string',
    });

exports.handler = async function ({ target }) {
  if (await db.isValidDatabase(target)) {
    console.error(`Cannot restore to ${target}; that database already exists!`);
   
    return process.exit(1);
  }

  const knex = db.connectAsSuper();
  await knex.raw(`
    create database ${target}
    template ${config.template || 'template1'}
  `);

  const p = spawn(`psql -d ${target}`, {    
    shell: true,
    stdio: 'inherit',
    env: db.createSuperPostgresEnv(),
  });
  p.on('exit', (code, signal) => {
    if (code !== 0) {
      console.error('child process exited with ' +
                    `code ${code} and signal ${signal}`);
    } else {
      console.error('Done!');
    }
    process.exit(code);
  });
};
