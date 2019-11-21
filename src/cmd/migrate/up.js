/* eslint-disable import/no-dynamic-require */
const config = require('../../config');
const delegate = require('./util/delegate');

if (config.migrations.backend) {
  const { backend } = config.migrations;
  module.exports = require(`./${backend}/up`);
} else {
  exports.command = 'up';
  exports.desc = 'migrates the current database to the latest version found in your migration directory';
  exports.builder = yargs => yargs;
  exports.handler = delegate('up', { setConfig: true });
}
