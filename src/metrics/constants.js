const fs = require('fs');
const path = require('path');
const xdg = require('@folder/xdg');

const dirs = xdg();
fs.mkdirSync(dirs.data, { recursive: true });

const SERVER_URL_HTTPS = 'https://pgsh-metrics.herokuapp.com';
const SERVER_URL_HTTP = 'http://pgsh-metrics.herokuapp.com';

const MAX_SAMPLES_PER_SEND = 500;
const STORE_PATH = path.join(dirs.data, 'pgsh_metrics_store.ndjson');

module.exports = {
  SERVER_URL_HTTPS,
  SERVER_URL_HTTP,
  MAX_SAMPLES_PER_SEND,
  STORE_PATH,
};
