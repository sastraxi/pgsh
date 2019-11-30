const { prompt } = require('enquirer');

const moment = require('moment');
const debug = require('debug')('pgsh:metrics');
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
    const { shouldEnable } = await prompt({
      type: 'toggle',
      name: 'shouldEnable',
      message: 'Would you like to send anonymous usage data to support further pgsh development?',
    });
    global.set(METRICS_ENABLED, shouldEnable);
    return shouldEnable;
  }
  return metricsEnabled;
};

const createSample = (exitCode) => ({
  ...getCpuMetrics(),
  exitCode,
  command: getCommandLine(),
  version: packageJson.version,
  startedAt: getStartedAt(),
  finishedAt: +moment(),
});

const recordMetric = async (exitCode) => {
  if (config.force_disable_metrics) return Promise.resolve();
  if (!await askForOptIn()) return Promise.resolve(); // user just opted out or already had

  const sample = createSample(exitCode);
  debug('record sample', sample);
  store.put(sample);
  return Promise.resolve(sample);
};

const recordMetricSync = (exitCode) => {
  if (config.force_disable_metrics) return null;
  if (!global.get(METRICS_ENABLED)) return null;

  const sample = createSample(exitCode);
  debug('record sample', sample);
  store.put(sample);
  return sample;
};

module.exports = {
  recordMetric,
  recordMetricSync,
};
