const { prompt } = require('enquirer');

const moment = require('moment');
const fs = require('fs');

const packageJson = JSON.parse(
  fs.readFileSync(
    require('find-config')('package.json'),
  ),
);

const getCpuMetrics = require('./cpu');
const config = require('../config');
const global = require('../global');
const { METRICS_ENABLED } = require('../global/keys');

const { get: getCommandLine } = require('./command-line');
const { get: getStartedAt } = require('./timer');
const store = require('./store');

const askForOptIn = async () => {
  const metricsEnabled = global.get(METRICS_ENABLED);
  if (metricsEnabled === undefined) {
    // TODO: ask the user to opt-in; write true or false
    const { shouldEnable } = prompt({
      type: 'toggle',
      name: 'shouldEnable',
      message: 'Would you like to send anonymous usage data to support further pgsh development?',
    });
    global.set(METRICS_ENABLED, shouldEnable);
    return shouldEnable;
  }
  return metricsEnabled;
};

const recordMetric = async (exitCode) => {
  if (config.force_disable_telemetry) return;
  if (!askForOptIn()) return;

  // create a data sample
  const sample = {
    ...getCpuMetrics(),
    exitCode,
    command: getCommandLine(),
    version: packageJson.version,
    startedAt: getStartedAt(),
    finishedAt: +moment(),
  };

  console.log('SAMPLE', sample);
  store.put(sample);
};

module.exports = recordMetric;
