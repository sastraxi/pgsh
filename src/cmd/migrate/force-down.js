/* eslint-disable import/no-dynamic-require */
const config = require('../../config');
const delegate = require('./util/delegate');

if (config.migrations.backend) {
  const { backend } = config.migrations;
  module.exports = require(`./${backend}/force-down`);
} else {
  exports.command = 'force-down <ver>';
  exports.desc = 'removes the record of any migration past the given version';

  exports.builder = yargs =>
    yargs
      .positional('ver', {
        describe: 'the migration number to migrate down to',
        type: 'number',
      });

  exports.handler = delegate('force-down', { setConfig: true });
}
