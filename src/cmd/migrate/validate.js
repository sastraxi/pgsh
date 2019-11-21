/* eslint-disable import/no-dynamic-require */
const config = require('../../config');
const delegate = require('./util/delegate');

if (config.migrations.backend) {
  const { backend } = config.migrations;
  module.exports = require(`./${backend}/validate`);
} else {
  exports.command = 'validate';
  exports.desc = 'validates the current database against the migration directory';
  exports.builder = yargs => yargs;
  exports.handler = delegate('validate', { setConfig: true });
}
