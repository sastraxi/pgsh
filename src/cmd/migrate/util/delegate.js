/* eslint-disable import/no-dynamic-require */
const detect = require('./detect');
const updateConfig = require('../../../pgshrc/update-existing');

const DEFAULT_OPTIONS = {
  setConfig: false,
};

module.exports = (command, { setConfig } = DEFAULT_OPTIONS) => async (yargs) => {
  const backend = await detect();
  if (!backend) {
    console.log('Could not detect a migrations backend! Exiting.');
    return process.exit(1);
  }

  if (setConfig) {
    updateConfig({
      migrations: { backend },
    });
  }

  const { handler } = require(`../${backend}/${command}`);
  return handler(yargs);
};
