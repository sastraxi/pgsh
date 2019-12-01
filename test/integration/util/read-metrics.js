const fs = require('fs');

const { STORE_PATH } = require('../../../src/metrics/constants');

const readMetrics = () => {
  const body = fs.readFileSync(STORE_PATH, { encoding: 'utf8' });
  const metrics = body.split('\n')
    .filter(x => x.trim() !== '')
    .map(x => JSON.parse(x));
  return metrics;
};

module.exports = readMetrics;
