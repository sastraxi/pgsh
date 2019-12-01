const { consume, numLines } = require('./util/stream-utils');
const makeContext = require('./util/context');

const APP = 'knexapp';
const cwd = require('./app/cwd')(APP);
const { env, config } = require('./app/dotfiles')(APP);

it('fails if env is already injected', async () => {
  const ctx = makeContext(cwd, config, env);
  const { pgshWithEnv } = ctx;
  const pgsh = pgshWithEnv({ ...process.env, ...env });

  { // any execution will fail with error 14!
    const { exitCode, errors } = pgsh('ls');

    await consume(errors, line => expect(line.split(' ')[0]).toEqual('FATAL:'), numLines(5));
    await consume(errors, null, numLines(1));
    await consume(errors, line => expect(line).toEqual(
      'UNSET these variables before running pgsh here.',
    ), numLines(1));

    expect(await exitCode).toBe(14);
  }
});

it('fails if .env is empty', async () => {
  const ctx = makeContext(cwd, config, {});
  const { pgsh } = ctx;

  { // any execution will exit 1
    const { exitCode, errors } = pgsh('ls');
    await consume(errors, line => expect(line).toEqual(
      'pgsh is configured to use the value of KNEXAPP_DB_DATABASE in your .env file, but it is unset. Exiting.',
    ), numLines(1));
    expect(await exitCode).toBe(54);
  }
});

it('fails if there is no .env', async () => {
  const ctx = makeContext(cwd, config, null);
  const { pgsh } = ctx;

  { // any execution will exit 1
    const { exitCode, output, errors } = pgsh('ls');
    await consume(output, console.log);
    await consume(errors, line => expect(line).toEqual(
      'pgsh is configured to use the value of KNEXAPP_DB_DATABASE in your .env file, but it is unset. Exiting.',
    ), numLines(1));
    expect(await exitCode).toBe(54);
  }
});
