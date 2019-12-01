const debug = require('debug')('pgsh:metrics');
const moment = require('moment');
const crypto = require('crypto');
const request = require('request-promise-native');

const { SERVER_URL, MAX_SAMPLES_PER_SEND } = require('./constants');

// Yep, this is in version control. Sue me!
const HMAC_KEY = '125091675yhiofa70rt2_pgsh_metrics_server';

// Actually, please don't sue me.
// ... why is it here? Well, pgsh is a CLI tool. It needs the key
//     to be able to sign packets before sending them to the
//     metrics server. Since the tool will be running on untrusted
//     computers, we can't really discern between our "deployment"
//     and someone else's. As far as I know, CLI CORS doesn't exist...
const hmac = (str) =>
  crypto
    .createHmac('sha1', HMAC_KEY)
    .update(str)
    .digest('hex');

// Anyway, the point is this: anyone who can download pgsh will
// have the key anyway, so why go to the trouble of hiding it?

const global = require('../global');
const {
  METRICS_ENABLED,
  METRICS_LAST_SENT,
  METRICS_IN_PROGRESS,
  METRICS_UPLOAD_PERIOD_SEC,
} = require('../global/keys');

const store = require('./store');

class RateLimited extends Error {
  constructor(remaining) {
    super(`Rate limit reached: ${remaining} available`);
    this.remaining = remaining;
  }
}

const actualSend = async (samples) => {
  const body = await store.get(samples);
  try {
    const response = await request.post(
      SERVER_URL,
      {
        headers: {
          'X-Pgsh-Signature': hmac(body),
          'Content-Type': 'text/plain',
        },
        body,
        json: false,
        gzip: true,
      },
    );
    debug('response from metrics server', response);

    // remove however many the server handled
    const { insert } = JSON.parse(response);
    debug('insert', insert);
    await store.discard(insert);
  } catch (err) {
    debug('metrics error', err);
    const { error, response, ...extra } = err;
    if (response.code === 429) {
      const remaining = +response.headers['x-rate-limit-remaining'];
      debug('recv from server remaining', remaining);
      throw new RateLimited(remaining);
    } else {
      console.error(error, extra);
    }
  }
};

const sendMetrics = async () => {
  if (global.get(METRICS_IN_PROGRESS)) {
    // let's assume they're trying to run a couple pgsh processes at once; it's OK
    // to miss uploading this time and just do it next time we have a clean mutex
    return;
  }

  global.set(METRICS_IN_PROGRESS, true);
  try {
    await actualSend(MAX_SAMPLES_PER_SEND);
  } catch (err) {
    if (err instanceof RateLimited) {
      console.log(`* retry with remaining: ${err.remaining}`);
      await actualSend(this.remaining);
    }
  }
  global.set(METRICS_IN_PROGRESS, false);
};

// eslint-disable-next-line
const sendMetricsIfTime = async () => {
  const timestamp = moment();

  if (global.get(METRICS_LAST_SENT)) {
    // upload exactly once each period
    const lastSent = moment(+global.get(METRICS_LAST_SENT));
    const uploadPeriodSec = +global.get(METRICS_UPLOAD_PERIOD_SEC, 3600);
    if (timestamp.subtract(uploadPeriodSec, 'seconds').isBefore(lastSent)) {
      // we still have some waiting to do.
      return;
    }
  }
  await sendMetrics();
  global.set(METRICS_LAST_SENT, +timestamp);
};

module.exports = async () => {
  if (global.get(METRICS_ENABLED)) {
    return sendMetricsIfTime();
  }
  debug('metrics disabled!');
  return Promise.resolve();
};
