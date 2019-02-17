const fs = require('fs');
const config = require('./config');
const findConfig = require('find-config');
const path = findConfig('.env');

/**
 * Replace a value in the given .env file.
 * Throws an error if the old value is missing.
 */
module.exports = (key, oldValue, newValue) => {
  if (!path) {
    throw new Error('Could not find .env file!');
  }

  const envContents = fs.readFileSync(path, config.dotenv_encoding || 'utf8');
  const replacedContents = envContents.replace(
    `${key}=${oldValue}`,
    `${key}=${newValue}`,
  );

  if (replacedContents === envContents) {
    throw new Error("Old key/value not found in .env!");
  }
  
  fs.writeFileSync(path, replacedContents);
};
