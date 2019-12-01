const findConfig = require('find-config');
const fs = require('fs');

module.exports = () => {
  console.log('IN GLOBAL TEARDOWN');

  // if .env and .pgshrc files exist in our path,
  // move them so the tests don't pick them up
  const envPath = findConfig('.env.pgshIntegrationBackup');
  if (envPath) {
    const originalPath = envPath.replace('.pgshIntegrationBackup', '');
    fs.unlinkSync(originalPath);
    fs.renameSync(envPath, originalPath);
  }
  const configPath = findConfig('.pgshrc.pgshIntegrationBackup');
  if (configPath) {
    fs.renameSync(configPath, configPath.replace('.pgshIntegrationBackup', ''));
  }
};
