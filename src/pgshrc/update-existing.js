const fs = require('fs');
const debug = require('debug')('pgsh:update-existing');
const deepEqual = require('deep-equal');
const findConfig = require('find-config');
const mergeOptions = require('merge-options');

const configPath = findConfig('.pgshrc');

/**
 * Replace a value in the current .pgshrc, optionally
 * throwing an error if nothing was changed.
 */
module.exports = (patch) => {
  if (!configPath) {
    throw new Error('Could not find .pgshrc file!');
  }

  const oldConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  const newConfig = mergeOptions(oldConfig, patch);

  if (deepEqual(oldConfig, newConfig, { strict: true })) {
    debug('Nothing was changed in .pgshrc!');
  }

  fs.writeFileSync(
    configPath,
    `${JSON.stringify(newConfig, null, 2)}\n`,
    { encoding: 'utf8' },
  );
};
