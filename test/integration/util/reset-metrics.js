const fs = require('fs');

const { STORE_PATH } = require('../../../src/metrics/constants');

const resetMetrics = () => {
  if (fs.existsSync(STORE_PATH)) {
    fs.unlinkSync(STORE_PATH);
  }
};

module.exports = resetMetrics;
