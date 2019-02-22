const fs = require('fs');
const path = require('path');
const findConfig = require('find-config');

module.exports = (config) => {
  const envPath = findConfig('.env');
  if (!envPath) {
    throw new Error('Cannot create a .pgshrc without a .env!');
  }

  const configPath = path.join(envPath, '../.pgshrc');
  fs.writeFileSync(
    configPath,
    `${JSON.stringify(config, null, 2)}\n`,
    { encoding: 'utf8' },
  );
  return configPath;
};
