const resetEntireDatabase = require('../db/reset-entire-database');
const integrationUrl = require('../db/integration-url');

module.exports = async () => {
  require('dotenv').config({ encoding: 'utf8' });

  // reasonable timeout for integration tests
  jest.setTimeout(10 * 1000);

  // purge all databases
  return resetEntireDatabase(integrationUrl);
};
