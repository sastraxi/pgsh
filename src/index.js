#! /usr/bin/env node
const config = require('./config');

require('dotenv').config({
  encoding: config.dotenv_encoding || 'utf8',
});

const list = require('./cmd/list');

// eslint-disable-next-line no-unused-expressions
require('yargs')
  .scriptName('pgsh')
  .usage('pgsh: developer tools for interacting with postgresql databases')
  .option('i', {
    alias: 'iso',
    type: 'boolean',
    describe: 'show timestamps in ISO-8601 format',
    default: false,
  })
  .option('verbose', {
    alias: 'a',
    type: 'boolean',
    default: false,
    describe: 'introspect databases and show their latest migrations',
  })
  .option('c', {
    alias: 'created',
    type: 'boolean',
    describe: 'order databse lists by creation time descending',
    default: false,
  })
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
