/* eslint-disable import/no-dynamic-require */
const config = require('../../config');
const delegate = require('./util/delegate');

const { set: setCommandLine } = require('../../metrics/command-line');
const endProgram = require('../../end-program');

if (config.migrations.backend) {
  const { backend } = config.migrations;
  module.exports = require(`./${backend}/validate`);
} else {
  exports.command = ['validate', 'status'];
  exports.desc = 'validates the current database against the migration directory';
  exports.builder = yargs => yargs;
  exports.handler = delegate('validate', {
    setConfig: true,

    // we can't detect any migrations backends; still display something.
    backupHandler: async (yargs) => {
      setCommandLine();
      const db = require('../../db')();
      const printLatest = require('./knex/util/print-latest-migration')(db, yargs);
      await printLatest();
      endProgram(0);
    },
  });
}
