#! /usr/bin/env node
const config = require('./config');

require('dotenv').config({
  encoding: config.dotenv_encoding || 'utf8',
});

const list = require('./cmd/list');

require('yargs')
  .scriptName('pgsh')
  .usage('pgsh: developer tools for interacting with postgresql databases')
  .commandDir('cmd', { recurse: true })
  .command(
    '$0',
    'list databases filtered by configured prefix',
    {},
    list.handler,
  )
  .demandCommand()
  .help()
  .epilogue('See https://github.com/sastraxi/pgsh for more information')
  .argv;
