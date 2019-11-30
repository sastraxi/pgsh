const { consume, numLines } = require('./util/stream-utils');
const makeContext = require('./util/context');

const APP = 'knexapp';
const cwd = require('./app/cwd')(APP);
const { env, config } = require('./app/dotfiles')(APP);

beforeAll(require('./util/setup')({ cwd, config, env }));

it('does fine if there is no .pgshrc', async () => {
  const ctx = makeContext(cwd, null, env);
  const { pgsh } = ctx;

  { // any execution will exit 1
    const { exitCode, errors } = pgsh('ls');
    await consume(errors, line => expect(line).toEqual(
      'pgsh is configured to use the value of DATABASE_URL in your .env file, but it is unset. Exiting.',
    ), numLines(1));
    expect(await exitCode).toBe(54);
  }
});
