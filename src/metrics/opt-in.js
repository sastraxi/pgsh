const { prompt } = require('enquirer');

const global = require('../global');
const { METRICS_ENABLED } = require('../global/keys');

const config = require('../config');

/**
 * Determine (potentially interactively) whether or not the user
 * has opted out of anonymous usage metrics (telemetry).
 */
const askForOptIn = async () => {
  const metricsEnabled = global.get(METRICS_ENABLED);
  console.error('metricsEnabled', metricsEnabled);
  console.error('config', config);
  console.error('current config', require('../config'));
  if (metricsEnabled === undefined) {
    // ask the user to opt-in; write true or false
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

module.exports = askForOptIn;
