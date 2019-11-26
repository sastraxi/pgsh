const { spawn } = require('child_process');
const flattenDeep = require('lodash.flattendeep');

exports.command = ['psql [name]', 'repl'];
exports.desc = 'connects to the current (or named) database with psql';

exports.builder = yargs =>
  yargs
    .positional('name', {
      describe: 'the name of the database to connect to',
      type: 'string',
      default: null,
    })
    .option('c', {
      alias: 'command',
      type: 'array',
      describe: 'Specifies that psql is to execute the given command string',
      default: [],
    })
    .option('f', {
      alias: 'file',
      type: 'array',
      describe: 'Read commands from the file filename, rather than standard input',
      default: [],
    })
    .option('s', {
      alias: 'super-user',
      type: 'boolean',
      describe: 'Connect to the database as superuser, if configured',
      default: false,
    });

exports.handler = (yargs) => {
  const {
    name,
    command,
    file,
    superUser,
    _,
  } = yargs;

  const db = require('../db')();
  const psqlArguments = flattenDeep([
    '-d', name || db.thisDb(),
    command.map(c => ['-c', c]),
    file.map(f => ['-f', f]),
    _.slice(1),
  ]);

  const p = spawn('psql', psqlArguments, {
    stdio: 'inherit',
    env: {
      ...process.env,
      ...(superUser
        ? db.createSuperPostgresEnv()
        : db.createPostgresEnv()),
    },
  });

  p.on('exit', (code) => {
    process.exit(code);
  });
};
