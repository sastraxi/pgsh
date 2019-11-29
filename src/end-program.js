const c = require('ansi-colors');
const { Spinner } = require('cli-spinner');

const CHECK_MS = 300;

const global = require('./global');
const { METRICS_IN_PROGRESS } = require('./global/keys');

const recordMetric = require('./metrics/record');

const endProgram = async (exitCode) => {
  if (global.get(METRICS_IN_PROGRESS)) {
    // assume it's us, and start showing a spinner
    const spinner = new Spinner(c.blueBright(
      'pgsh is sending anonymous usage statistics.',
    ));
    spinner.setSpinnerString(19);
    spinner.start();

    // wait for the process to end
    return new Promise((resolve) => {
      setInterval(async () => {
        if (!global.get(METRICS_IN_PROGRESS)) {
          // now we can record and exit
          spinner.stop();
          await recordMetric(exitCode);
          process.exit(exitCode);
          resolve(); // probably unnecessary
        }
      }, CHECK_MS);
    });
  }

  // we're in the clear; record our metrics.
  await recordMetric(exitCode);
  return new Promise(() => process.exit(exitCode));
};

module.exports = endProgram;
