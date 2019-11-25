const fs = require('fs');
const parseMigrationName = require('./parse-migration-name');

module.exports = (migrationsPath) => {
  if (!fs.existsSync(migrationsPath)
    || !fs.lstatSync(migrationsPath).isDirectory()) {
    return [];
  }

  return fs.readdirSync(migrationsPath)
    .map(filename => parseMigrationName(migrationsPath, filename));
};
