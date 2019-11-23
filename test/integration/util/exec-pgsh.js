const pick = require('lodash.pick');
const fs = require('fs');
const { spawn } = require('child_process');
const path = require('path');
const debug = require('debug')('integration:util:exec-pgsh');

const findPgsh = require('./find-pgsh');

module.exports = (workingDirectory, args, env, pgshrc) => {
  const cwd = workingDirectory.startsWith('/')
    ? workingDirectory
    : path.resolve(workingDirectory);

  const ENV_PATH = path.join(cwd, '.env');
  if (env) {
    fs.writeFileSync(ENV_PATH, env);
  } else {
    fs.unlinkSync(ENV_PATH);
  }

  const PGSHRC_PATH = path.join(cwd, '.pgshrc');
  if (pgshrc) {
    fs.writeFileSync(PGSHRC_PATH, pgshrc);
  } else {
    fs.unlinkSync(PGSHRC_PATH);
  }

  const pgsh = spawn(findPgsh(), args, {
    cwd,
    shell: true,
  });

  const exitCode = new Promise((resolve) => {
    pgsh.on('close', (code) => {
      debug(`child process exited with code ${code}`);
      resolve(code);
    });
  });

  pgsh.stderr.setEncoding('utf8');
  pgsh.stdout.setEncoding('utf8');

  return {
    exitCode,
    ...pick(pgsh, ['stdin', 'stdout', 'stderr']),
  };
};
