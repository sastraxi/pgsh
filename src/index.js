#! /usr/bin/env node
const config = require('./config');

require('dotenv').config({
  encoding: config.dotenv_encoding || 'utf8',
});

const list = require('./cmd/list');

require('yargs')
  .commandDir('cmd')
  .command(
    '$0',
    'list databases filtered by configured prefix',
    {},
    list.handler,
  )
  .demandCommand()
  .help()
  .argv
