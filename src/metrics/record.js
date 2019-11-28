const { prompt } = require('enquirer');

const config = require('../config');
const global = require('../global');
const { METRICS_ENABLED } = require('../global/keys');

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
  }
};

const record = async () => {
  if (config.force_disable_telemetry) return;

};

module.exports = record;
