const crypto = require('crypto');

const randomString = require('./random-string');
const global = require('../global');
const { QUICK_HASH_KEY } = require('../global/keys');

let key = global.get(QUICK_HASH_KEY);
if (!key) {
  key = randomString(48);
  global.set(QUICK_HASH_KEY, key);
}

const quickHash = (str) => {
  const hexString = crypto
    .createHmac('sha256', key)
    .update(str)
    .digest('hex')
    .substr(0, 6);
  return `<${hexString}>`;
};

module.exports = quickHash;
