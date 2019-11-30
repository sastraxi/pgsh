const findConfig = require('find-config');
const { exec } = require('child_process');
const fs = require('fs');

const run = (cmd) =>
  new Promise((resolve, reject) => {
    exec(cmd, (err, stdout, stderr) => {
      if (err) {
        console.error(`could not run ${cmd}`, err);
        return reject(stderr);
      }
      return resolve(stdout);
    });
  });

// FIXME: do we need to do this? https://github.com/kulshekhar/ts-jest/issues/411#issuecomment-355738435

module.exports = async () => {
  // if .env and .pgshrc files exist in our path,
  // move them so the tests don't pick them up
  if (!findConfig('.env.pgshIntegrationBackup')) { // e.g. jest was CTRL+C'd
    const envPath = findConfig('.env');
    if (envPath) {
      const backupEnvPath = `${envPath}.pgshIntegrationBackup`;
      fs.renameSync(envPath, backupEnvPath);
      // get a version of .env that only carries integration testing stuff
      await run(`cat ${backupEnvPath} | grep DANGER_INTEGRATION > ${envPath}`);
    }
  }
  if (!findConfig('.pgshrc.pgshIntegrationBackup')) { // e.g. jest was CTRL+C'd
    const configPath = findConfig('.pgshrc');
    if (configPath) {
      fs.renameSync(configPath, `${configPath}.pgshIntegrationBackup`);
    }
  }

  // set up our process.env
  require('dotenv').config({ encoding: 'utf8' });

  // purge all databases
  const resetEntireDatabase = require('./db/reset-entire-database');
  const integrationUrl = require('./db/integration-url');
  return resetEntireDatabase(integrationUrl);
};
