const { spawn } = require('child_process');

exports.command = 'psql [name]';
exports.desc = 'connects to the current (or named) database with psql';

exports.builder = yargs =>
  yargs
    .positional('name', {
      describe: 'the name of the database to connect to',
      type: 'string',
      default: null,
    });

exports.handler = ({ name }) => {
  const db = require('../db');
  const p = spawn('psql', ['-d', name || db.thisDb()], {
    stdio: 'inherit',
    env: {
      ...process.env,
      ...db.createSuperPostgresEnv(),
    },
  });
  p.on('exit', (code) => {
    process.exit(code);
  });
};
