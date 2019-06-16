/* eslint-disable import/no-dynamic-require */
const config = require('../../config');
const delegate = require('./util/delegate');

if (config.migrations.backend) {
  const { backend } = config.migrations;
  module.exports = require(`${backend}/down`);
} else {
  exports.command = 'down <ver>';
  exports.desc = 'down-migrates the current database to the given migration';

  exports.builder = yargs =>
    yargs
      .positional('ver', {
        describe: 'the migration to migrate down to',
        type: 'number',
      });

  exports.handler = delegate('down', { setConfig: true });
}
