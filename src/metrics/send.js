/* eslint-disable */
const cron = require('node-cron');
const moment = require('moment');

const global = require('./global');
const { LAST_SENT, METRICS_ENABLED } = require('./global/keys');

class RateLimited extends Error {
  constructor(remaining) {
    super(`rate limit reached: ${remaining} available`);
    this.remaining = remaining;
  }
}

const shouldSend = () => {
  const timestamp = moment();

  if (global.get(LAST_SENT)) {
    const lastSent = moment(global.get(LAST_SENT));
    if (timestamp.subtract(1, 'hour').isBefore(lastSent)) {
      // we still have some waiting to do.
      return;
    }
  }

  // aggregate all of the clump that there is to send.


  global.set(LAST_SENT, timestamp);
};

const metricsEnabled = global.get(METRICS_ENABLED);

if (metricsEnabled) {
  // ...
}
