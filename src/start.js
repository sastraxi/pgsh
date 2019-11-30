const global = require('./global');
const { start: startTimer } = require('./metrics/timer');
const { METRICS_IN_PROGRESS } = require('./global/keys');
const tryToSendMetrics = require('./metrics/send');

const start = () => {
  // don't tread on a running upload process
  if (global.get(METRICS_IN_PROGRESS)) {
    if (process.argv.indexOf('-x') === -1) {
      console.error('pgsh still has lockfiles open. Please kill these processes or call pgsh again with -x');
      process.exit(92);
    }
    global.set(METRICS_IN_PROGRESS, false);
  }

  // send metrics, if it's time
  tryToSendMetrics();

  // start the timer
  startTimer();
};

module.exports = start;
