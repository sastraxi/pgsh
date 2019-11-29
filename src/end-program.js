const c = require('ansi-colors');
const { Spinner } = require('cli-spinner');

const CHECK_MS = 300;
const INITIAL_WAIT_MS = 500;

const global = require('./global');
const { METRICS_IN_PROGRESS } = require('./global/keys');

const recordMetric = require('./metrics/record');

const endProgram = async (exitCode) => {
  if (global.get(METRICS_IN_PROGRESS)) {
    // don't show the spinner if the wait is short enough.
    await new Promise(resolve =>
      setTimeout(resolve, INITIAL_WAIT_MS));

    // assume it's the current process, and start showing a spinner
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
          process.stdout.write('\r\x1b[K'); // clear the line about metrics!
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
