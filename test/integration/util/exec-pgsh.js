const path = require('path');
const readline = require('readline');
const { spawn } = require('child_process');

const stripAnsiStream = require('strip-ansi-stream');

const debug = require('debug')('integration:util:1-pgsh');

const PGSH_PATH = require('./find-pgsh')();

module.exports = (workingDirectory, args, env = undefined) => {
  const cwd = workingDirectory.startsWith('/')
    ? workingDirectory
    : path.resolve(workingDirectory);

  const pgsh = spawn(PGSH_PATH, args, {
    cwd,
    shell: true,
    env,
  });

  const exitCode = new Promise((resolve) => {
    pgsh.on('close', (code) => {
      debug(`child process exited with code ${code}`);
      resolve(code);
    });
  });

  pgsh.stderr.setEncoding('utf8');
  pgsh.stdout.setEncoding('utf8');

  const readStdout = readline.createInterface(
    pgsh.stdout.pipe(stripAnsiStream()),
  );
  const output = readStdout[Symbol.asyncIterator]();

  const readStderr = readline.createInterface(
    pgsh.stderr.pipe(stripAnsiStream()),
  );
  const errors = readStderr[Symbol.asyncIterator]();

  const sendText = text =>
    new Promise(onDrain =>
      pgsh.stdin.write(text, onDrain));

  pgsh.stderr.on('data', console.error);

  const sendKey = keyCode => pgsh.stdin.write(keyCode);
  return {
    exitCode,
    output,
    errors,
    sendText,
    send: {
      up: () => sendKey('\x1B\x5B\x41'),
      down: () => sendKey('\x1B\x5B\x42'),
      enter: () => sendKey('\x0D'),
      space: () => sendKey('\x20'),
      ctrlC: () => sendKey('\x03'),
    },
  };
};
