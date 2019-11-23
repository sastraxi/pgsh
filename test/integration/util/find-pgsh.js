const fs = require('fs');
const path = require('path');
const debug = require('debug')('integration:util:find-pgsh');
const findConfig = require('find-config');

/**
 * Quickly detect the entrypoint for pgsh in this repository.
 */
module.exports = () => {
  const packageJson = findConfig('package.json');
  if (!packageJson) {
    debug('could not find package.json');
    return false;
  }

  const { name, bin } = JSON.parse(fs.readFileSync(packageJson, 'utf8'));
  if (name !== 'pgsh') {
    debug(`Found a different package.json than expected: ${name}`);
    return false;
  }

  const relativePathToEntrypoint = bin.pgsh;
  const resolvedPath = path.join(
    path.dirname(packageJson),
    relativePathToEntrypoint,
  );

  debug(resolvedPath);
  return resolvedPath;
};
