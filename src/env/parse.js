const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const findProjectRoot = require('../util/find-project-root');

const config = require('../config');

module.exports = () => {
  const projectRoot = findProjectRoot();
  const dotenvPath = path.join(projectRoot, '.env');

  if (!fs.existsSync(dotenvPath)) return null;

  return dotenv.parse(fs.readFileSync(dotenvPath), {
    encoding: config.dotenv_encoding,
  });
};
