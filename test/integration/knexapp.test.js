#! /usr/bin/env node
require('dotenv').config();

const readline = require('readline');
const stripAnsiStream = require('strip-ansi-stream');

const execPgsh = require('./util/exec-pgsh');

const pgshrc = `
{
  "mode": "split",
  "vars": {
    "host": "INTEGRATION_HOST",
    "port": "INTEGRATION_PORT",
    "user": "INTEGRATION_USER",
    "password": "INTEGRATION_PASSWORD",
    "database": "INTEGRATION_DATABASE"
  },
  "migrations": {
    "backend": "knex"
  }
}
`;

const env = `
INTEGRATION_HOST=${process.env.INTEGRATION_HOST}
INTEGRATION_PORT=${process.env.INTEGRATION_PORT}
INTEGRATION_USER=${process.env.INTEGRATION_USER}
INTEGRATION_PASSWORD=${process.env.INTEGRATION_PASSWORD}
INTEGRATION_DATABASE=knexapp
`;

console.log(env);

it('prints out the current database correctly', async () => {
  const { exitCode, stdout } = execPgsh(
    `${__dirname}/knexapp`,
    ['list'],
    env,
    pgshrc,
  );

  const rl = readline.createInterface(
    stdout.pipe(stripAnsiStream()),
  );

  let matchedLines = 0;

  rl.on('line', (line) => {
    console.log('line:', line);
    if (line.startsWith('*')) {
      expect(line).toEqual('* knexapp');
      matchedLines += 1;
    }
  });

  expect(await exitCode).toBe(0);
  expect(matchedLines).toBe(1);
});
