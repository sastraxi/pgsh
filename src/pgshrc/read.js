const fs = require('fs');
const c = require('ansi-colors');
const findConfig = require('find-config');
const mergeOptions = require('merge-options');

const path = findConfig('.pgshrc');

const defaultConfig = require('./default');

let userConfig;
try {
  userConfig = path
    ? JSON.parse(fs.readFileSync(path, 'utf8'))
    : null;
} catch (err) {
  console.error(`${c.red('FATAL:')} error parsing ${c.underline('.pgshrc')}.`);
  console.error(err);
  require('../end-program')(15);
}

const config = mergeOptions(defaultConfig, userConfig || {});

// eslint-disable-next-line no-unused-vars
const printConfig = () => {
  console.log('*********** CONFIG ***************');
  console.log(JSON.stringify(config, null, 2));
  console.log('*********** CONFIG ***************');
};

module.exports = config;
