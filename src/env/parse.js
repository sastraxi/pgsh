const fs = require('fs');
const dotenv = require('dotenv');
const findConfig = require('find-config');
const config = require('../config');

const dotenvPath = findConfig('.env');

module.exports = () => {
  if (!dotenvPath) return null;
  return dotenv.parse(fs.readFileSync(dotenvPath), {
    encoding: config.dotenv_encoding,
  });
};
