/* eslint-disable import/no-dynamic-require */
const config = require('../../config');
const delegate = require('./util/delegate');

if (config.migrations.backend) {
  const { backend } = config.migrations;
  module.exports = require(`./${backend}/force-up`);
} else {
  exports.command = 'force-up';
  exports.desc = 're-writes the migrations record entirely based on your migrations directory';
  exports.builder = yargs => yargs;
  exports.handler = delegate('force-up', { setConfig: true });
}
