const { spawn } = require('child_process');

const { set: setCommandLine } = require('../metrics/command-line');
const endProgram = require('../end-program');

exports.command = 'restore <target>';
exports.desc = 'restores a previously-dumped database as target from sql on stdin';

exports.builder = yargs =>
  yargs
    .positional('target', {
      describe: 'the name of the restored database',
      type: 'string',
    });

exports.handler = async ({ target }) => {
  const db = require('../db')();
  setCommandLine(target);

  if (await db.isValidDatabase(target)) {
    console.error(`Cannot restore to ${target}; that database already exists!`);
    return endProgram(1);
  }

  const knex = db.connectAsSuper(); // createdb
  await knex.raw(`
    create database "${target}"
    template ${db.config.template}
  `);

  const p = spawn(`psql -d ${target}`, {
    shell: true,
    stdio: 'inherit',
    env: db.createSuperPostgresEnv(),
  });
  return p.on('exit', (code, signal) => {
    if (code !== 0) {
      console.error('child process exited with '
                    + `code ${code} and signal ${signal}`);
    } else {
      console.error('Done!');
    }
    endProgram(code);
  });
};
