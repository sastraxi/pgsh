const fs = require('fs');
const findConfig = require('find-config');
const mergeOptions = require('merge-options');

const path = findConfig('.pgshrc');

const defaultConfig = require('./default');

const userConfig = path
  ? JSON.parse(fs.readFileSync(path))
  : null;


const config = mergeOptions(defaultConfig, userConfig || {});

// eslint-disable-next-line no-unused-vars
const printConfig = () => {
  console.log('*********** CONFIG ***************');
  console.log(JSON.stringify(config, null, 2));
  console.log('*********** CONFIG ***************');
};

module.exports = config;
