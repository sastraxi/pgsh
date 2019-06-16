const fs = require('fs');
const debug = require('debug')('pgsh:detect');
const findConfig = require('find-config');

/**
 * Quickly detect whether or not this project uses knex migrations.
 * FIXME: right now, this simply detects if the project uses knex.
 */
module.exports = async () => {
  if (findConfig('knexfile.js')) {
    debug('found knexfile.js');
    return true;
  }
  debug('could not find knexfile.js');

  const packageJson = findConfig('package.json');
  if (!packageJson) {
    debug('could not find package.json');
    return false;
  }

  const { dependencies, devDependencies } = JSON.parse(fs.readFileSync(packageJson, 'utf8'));
  const foundVersion = dependencies.knex || devDependencies.knex;
  debug(foundVersion ? `found knex:${foundVersion}` : 'could not find knex');
  return !!foundVersion;
};
