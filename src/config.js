const fs = require('fs');
const chalk = require('chalk');
const findConfig = require('find-config');

const path = findConfig('.pgshrc');

const config = path
  ? JSON.parse(fs.readFileSync(path))
  : null;

if (!config) {
  console.error(
    `Could not find ${chalk.yellowBright('.pgshrc')} in this`
    + ' directory or its ancestors; exiting.',
  );
  process.exit(5);
}

module.exports = config;
