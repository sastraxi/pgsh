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

const { get: getStartedAt } = require('./timer');

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


const record = async ({ command, exitCode, interactive = false }) => {
  if (config.force_disable_telemetry) return;
  if (!askForOptIn()) return;

  // create a data sample
  const sample = {
    ...getCpuMetrics(),
    command,
    exitCode,
    interactive,
    version: packageJson.version,
    startedAt: getStartedAt(),
    finishedAt: +moment(),
  };

  console.log(sample);
  // TODO: actually send
};

module.exports = record;
