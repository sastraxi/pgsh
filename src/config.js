const chalk = require('chalk');
const config = require('./pgshrc/read');

if (!config) {
  console.error(
    `Could not find ${chalk.yellowBright('.pgshrc')} in this`
    + ' directory or its ancestors; exiting.',
  );
  process.exit(5);
}

module.exports = config;
