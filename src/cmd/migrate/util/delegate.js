/* eslint-disable import/no-dynamic-require */
const detect = require('./detect');
const updateConfig = require('../../../pgshrc/update-existing');

const DEFAULT_OPTIONS = {
  setConfig: false,
  backupHandler: undefined,
};

/**
 * Returns a yargs handler that tries to figure out which backend to run,
 * sets it in .pgshrc, then delegates to an existing command's handler.
 */
const delegate = (command, { setConfig, backupHandler } = DEFAULT_OPTIONS) => async (yargs) => {
  const backend = await detect();
  if (!backend) {
    console.log('Could not detect a migrations backend.');
    if (backupHandler) {
      console.log('running backup cmd');
      return backupHandler(yargs);
    }
    throw new Error('no backend detected');
  }

  if (setConfig) {
    updateConfig({
      migrations: { backend },
    });
  }

  const { handler } = require(`../${backend}/${command}`);
  return handler(yargs);
};

module.exports = delegate;
