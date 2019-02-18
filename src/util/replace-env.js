const fs = require('fs');
const findConfig = require('find-config');
const config = require('../config');

const dotenvPath = findConfig('.env');

/**
 * Replace a value in the given .env file.
 * Throws an error if the old value is missing.
 */
module.exports = (patch) => {
  if (!dotenvPath) {
    throw new Error('Could not find .env file!');
  }

  const envContents = fs.readFileSync(
    dotenvPath,
    config.dotenv_encoding || 'utf8',
  );

  let replacedContents = envContents;
  Object.keys(patch).forEach((key) => {
    const value = patch[key];
    replacedContents = replacedContents.replace(
      new RegExp(
        `^${key}=.*$`,
        'im',
      ),
      `${key}=${value}`,
    );
  });

  if (replacedContents === envContents) {
    throw new Error('Old key/value not found in .env!');
  }

  fs.writeFileSync(dotenvPath, replacedContents);
};
