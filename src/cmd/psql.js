const { spawn } = require('child_process');
const db = require('../db');

exports.command = 'psql [name]';
exports.desc = 'connects to the current (or named) database with psql';

exports.builder = yargs =>
  yargs
    .positional('name', {
      describe: 'the name of the database to connect to',
      type: 'string',
      default: db.thisDb(),
    });

exports.handler = ({ name }) => {
  const p = spawn('psql', ['-d', name], {
    stdio: 'inherit',
    env: {
      ...db.createSuperPostgresEnv(),
      TERM: 'xterm',
    },
  });
  p.on('exit', (code) => {
    process.exit(code);
  });
};
