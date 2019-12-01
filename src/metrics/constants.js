const fs = require('fs');
const path = require('path');
const xdg = require('@folder/xdg');

const dirs = xdg();
fs.mkdirSync(dirs.data, { recursive: true });

const SERVER_URL = 'https://pgsh-metrics.herokuapp.com';
const MAX_SAMPLES_PER_SEND = 500;
const STORE_PATH = path.join(dirs.data, 'pgsh_metrics_store.ndjson');

module.exports = {
  SERVER_URL,
  MAX_SAMPLES_PER_SEND,
  STORE_PATH,
};
