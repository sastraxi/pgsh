const db = require('../db');
const { spawn } = require('child_process');

exports.command = 'dump [target]';
exports.desc = 'dumps either the current database, or the named one (if given) to stdout';

exports.builder = yargs =>
  yargs
    .positional('target', {
      describe: 'the database to dump',
      type: 'string',
      default: db.thisDb(),
    })

exports.handler = async function ({ target }) {
  if (!(await db.isValidDatabase(target))) {
    console.error(`${target} is not a valid database.`);
    return process.exit(2);
  }

  const p = spawn('pg_dump', [target], {
    stdio: 'inherit',
    env: db.createSuperPostgresEnv(),
  });
  p.on('exit', (code, signal) => {
    console.error('child process exited with ' +
                  `code ${code} and signal ${signal}`);
    process.exit(code);
  });
};
