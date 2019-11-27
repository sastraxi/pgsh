/* eslint-disable */
const global = require('./global');
const { METRICS_ENABLED } = require('./global/keys');

let metricsEnabled = global.get(METRICS_ENABLED);

if (metricsEnabled === undefined) {
  // TODO: ask the user to opt-in; write true or false

  metricsEnabled = true;
  global.set(METRICS_ENABLED, metricsEnabled);
}

if (metricsEnabled) {

}
