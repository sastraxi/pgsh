const { spawn } = require('child_process');

exports.command = 'dump [target]';
exports.desc = 'dumps either the current database, or the named one (if given) to stdout';

exports.builder = yargs =>
  yargs
    .positional('target', {
      describe: 'the database to dump',
      type: 'string',
      default: null,
    });

exports.handler = async ({ target }) => {
  const db = require('../db');
  const name = target || db.thisDb();

  if (!(await db.isValidDatabase(name))) {
    console.error(`${target} is not a valid database.`);
    return process.exit(2);
  }

  const p = spawn('pg_dump', [name], {
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
    process.exit(code);
  });
};
