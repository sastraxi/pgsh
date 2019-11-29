const crypto = require('crypto');

const buf = crypto.randomBytes(256);

const quickHash = (str) => {
  const hexString = crypto
    .createHmac('sha256', buf.toString('hex'))
    .update(str)
    .digest('hex')
    .substr(0, 6);
  return `<${hexString}>`;
};

module.exports = quickHash;
