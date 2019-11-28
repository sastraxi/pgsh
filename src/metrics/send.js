/* eslint-disable */
const moment = require('moment');
const crypto = require('crypto');

const SERVER_URL = 'https://pgsh-metrics.herokuapp.com';

// Yep, this is in version control. Sue me!
const HMAC_KEY = '125091675yhiofa70rt2_pgsh_metrics_server';

// Actually, please don't sue me.
// ... why is it here? Well, pgsh is a CLI tool. It needs the key
//     to be able to sign packets before sending them to the
//     metrics server. Since the tool will be running on untrusted
//     computers, we can't really discern between our "deployment"
//     and someone else's. As far as I know, CLI CORS doesn't exist...
const hmac = (obj) =>
crypto
  .createHmac('sha1', HMAC_KEY)
  .update(JSON.stringify(obj))
  .digest('hex');

// Anyway, the point is this: anyone who can download pgsh will
// have the key anyway, so why go to the trouble of hiding it?

const global = require('../global');
const { LAST_SENT, METRICS_ENABLED, METRICS_IN_PROGRESS } = require('../global/keys');

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

const sendMetrics = async () => {
  if (global.get(METRICS_IN_PROGRESS)) {
    // let's assume they're trying to run a couple pgsh processes at once; it's OK
    // to miss uploading this time and just do it next time we have a clean mutex
    return;
  }
  global.set(METRICS_IN_PROGRESS, true);
  {
    // todo: actually send to the server
  }
  global.set(METRICS_IN_PROGRESS, false);
};


module.exports = async () => {
  if (global.get(METRICS_ENABLED)) {
    // TODO: invoke shouldSend
    return sendMetrics();
  }
}

