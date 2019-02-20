const path = require('path');
const findConfig = require('find-config');

/**
 * Returns the closest ancestor directory that contains
 * a file or directory matching name, and returns its enclosing directory.
 * Returns null if the given name cannot be found.
 */
const dirOf = (name) => {
  const configPath = findConfig(name);
  return configPath ? path.join(configPath, '..') : null;
};

module.exports = () =>
  dirOf('.env')
  || dirOf('package.json')
  || dirOf('build.gradle')
  || dirOf('pom.xml')
  || process.cwd();
