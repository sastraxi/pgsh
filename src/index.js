#! /usr/bin/env node
const config = require('./config');

require('dotenv').config({
  encoding: config.dotenv_encoding || 'utf8',
});

// eslint-disable-next-line no-unused-expressions
require('yargs')
  .scriptName('pgsh')
  .usage('pgsh: developer tools for interacting with postgres databases')
  .option('i', {
    alias: 'iso',
    type: 'boolean',
    describe: 'show timestamps in ISO-8601 format',
    default: false,
  })
  .option('verbose', {
    alias: 'a',
    type: 'boolean',
    default: undefined,
    describe: 'introspect databases and show their latest migrations',
  })
  .strict()
  .commandDir('cmd', { recurse: false })
  .commandDir('cmd/migrate', { recurse: false })
  .demandCommand(1, 'No command specified!')
  .help()
  .epilogue('See https://github.com/sastraxi/pgsh for more information')
  .argv;
