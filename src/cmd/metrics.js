const c = require('ansi-colors');

const { set: setCommandLine } = require('../metrics/command-line');
const endProgram = require('../end-program');

const global = require('../global');
const { METRICS_ENABLED } = require('../global/keys');

const config = require('../config');
const updateConfig = require('../pgshrc/update-existing');

exports.command = 'metrics [state]';
exports.desc = 'enables or disables metrics';

exports.builder = yargs => yargs
  .positional('state', {
    describe: 'should we collect and send anonymous usage metrics?',
    choices: ['on', 'off'],
    default: undefined,
  });

exports.handler = ({ state }) => {
  setCommandLine();

  if (state === undefined) {
    const metricsEnabled = global.get(METRICS_ENABLED);
    console.log(`Telemetry is currently ${metricsEnabled ? 'enabled' : 'disabled'} globally.`);
    return endProgram(0);
  }

  const metricsEnabled = state === 'on';

  global.set(METRICS_ENABLED, metricsEnabled);
  console.log(`Telemetry is now ${metricsEnabled ? 'enabled' : 'disabled'} globally.`);

  // metrics are specifically disabled for this repository;
  // remove and let the user know what we did
  if (metricsEnabled && config.force_disable_metrics) {
    updateConfig({
      force_disable_metrics: false,
    });
    console.log(`Removed ${c.yellowBright('force_disable_metrics')} from ${c.underline('.pgshrc')}.`);
  }

  return endProgram(0);
};
