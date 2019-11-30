const findConfig = require('find-config');
const fs = require('fs');

module.exports = () => {
  console.log('IN GLOBAL TEARDOWN');

  // if .env and .pgshrc files exist in our path,
  // move them so the tests don't pick them up
  const envPath = findConfig('.env.pgshIntegrationBackup');
  if (envPath) {
    fs.unlinkSync(envPath);
    fs.renameSync(envPath.replace('.pgshIntegrationBackup', ''), envPath);
  }
  const configPath = findConfig('.pgshrc.pgshIntegrationBackup');
  if (configPath) {
    fs.renameSync(configPath.replace('.pgshIntegrationBackup', ''), configPath);
  }
};
