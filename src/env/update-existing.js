const fs = require('fs');
const findConfig = require('find-config');
const config = require('../config');

const dotenvPath = findConfig('.env');

const DEFAULT_OPTIONS = {
  throwIfUnchanged: true,
};

/**
 * Replace a value in the given .env file, optionally
 * throwing an error if nothing was changed.
 */
module.exports = (patch, { throwIfUnchanged } = DEFAULT_OPTIONS) => {
  if (!dotenvPath) {
    throw new Error('Could not find .env file!');
  }

  const encoding = config.dotenv_encoding || 'utf8';
  const envContents = fs.readFileSync(
    dotenvPath,
    encoding,
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

  if (replacedContents === envContents && throwIfUnchanged) {
    throw new Error('Old key/value not found in .env!');
  }

  fs.writeFileSync(
    dotenvPath,
    replacedContents,
    { encoding },
  );
};
