const backoff = require('backoff');
const connectionCountTask = require('../task/connection-count');

const fibonacciBackoff = backoff.fibonacci({
  randomisationFactor: 0,
  initialDelay: 300,
  maxDelay: 12000,
});

/**
 * Waits until no other sessions are accessing the given database.
 *
 * @param {*} db a Database connection
 * @param {*} target the name of the database to monitor
 * @param {*} interruptHandler if we need to abandon waiting for any reason, call this
 * @param {*} failFast give up immediately if the database is not available
 */
const waitFor = (db, target, interruptHandler, failFast = false) =>
  new Promise(async (resolve) => {
    const connectionCount = connectionCountTask(db);
    const otherConnections = await connectionCount(target);
    const isPlural = otherConnections !== 1;

    if (otherConnections === 0) {
      return resolve();
    }

    console.log(
      `There ${isPlural ? 'are' : 'is'} ${otherConnections} other session${isPlural ? 's' : ''}`,
      `using the database.${failFast ? '' : ' (waiting)'}`,
    );

    if (failFast) {
      return interruptHandler();
    }

    const readyHandler = async () => {
      const count = await connectionCount(target);
      if (count > 0) {
        console.log(`${count}...`);
        fibonacciBackoff.backoff();
      } else {
        process.removeListener('SIGINT', interruptHandler);
        fibonacciBackoff.removeListener('ready', readyHandler);
        fibonacciBackoff.reset();
        resolve();
      }
    };
    process.on('SIGINT', interruptHandler);
    fibonacciBackoff.on('ready', readyHandler);
    return fibonacciBackoff.backoff();
  });

module.exports = waitFor;
