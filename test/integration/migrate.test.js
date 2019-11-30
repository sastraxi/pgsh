const matcher = require('./util/matcher');
const { consume, numLines } = require('./util/stream-utils');
const makeContext = require('./util/context');
const randomString = require('../../src/util/random-string');

const APP = 'knexapp';
const cwd = require('./app/cwd')(APP);
const { env, config } = require('./app/dotfiles')(APP);

it('migrates properly upon creation', async () => {
  const ctx = makeContext(cwd, config, env);
  const { pgsh } = ctx;

  const database = randomString();

  { // create, run migrations, and switch
    const { exitCode, output, send } = pgsh('create', database);
    await consume(output, null, numLines(2));
    await send.down(); // run migrations
    await send.enter();
    expect(await exitCode).toBe(0);
  }
  { // ensure we're at the latest migration
    const { exitCode, output } = pgsh('status', '-a');
    await consume(output, line => expect(line).toMatch(
      matcher.startsWith(`* ${database} 20191124331980_data.js`),
    ), numLines(1));
    expect(await exitCode).toBe(0);
  }
});

it('can migrate up and down successfully', async () => {
  const ctx = makeContext(cwd, config, env);
  const { pgsh } = ctx;

  const database = randomString();

  { // create and switch but don't run migrations
    const { exitCode, output } = pgsh('create', database, '--no-migrate');
    await consume(output);
    expect(await exitCode).toBe(0);
  }
  { // ensure we're *not* migrated
    const { exitCode, output } = pgsh('status', '--no-verbose');
    await consume(output, line => expect(line).toEqual(`* ${database}`), numLines(1));

    const EXPECTED_UNMIGRATED = [
      '20191124214437_init.js',
      '20191124305523_add_image_url.js',
      '20191124331980_data.js',
    ];
    const unmigrated = [];
    await consume(output, (line) => {
      const [mark, name] = line.trim().split(' ');
      if (mark === '?') {
        unmigrated.push(name);
      }
    });
    expect(unmigrated.sort()).toEqual(EXPECTED_UNMIGRATED.sort());
    expect(await exitCode).toBe(0);
  }
  { // migrate up
    const { exitCode, output } = pgsh('up');
    await consume(output);
    expect(await exitCode).toBe(0);
  }
  { // ensure we're at the latest migration
    const { exitCode, output } = pgsh('status');
    await consume(output, line => expect(line).toMatch(
      matcher.startsWith(`* ${database} 20191124331980_data.js`),
    ), numLines(1));
    expect(await exitCode).toBe(0);
  }
  { // migrate down to the first (and use its suffix to do so)
    const { exitCode, output } = pgsh('down', 'init');
    await consume(output, line => expect(line).toContain('↓'), numLines(2));
    await consume(output, line => expect(line).toMatch(
      matcher.startsWith(`* ${database} 20191124214437_init.js`),
    ), numLines(1));
    expect(await exitCode).toBe(0);
  }
  { // migrate up and ensure we're at the latest migration
    const { exitCode, output } = pgsh('up');
    await consume(output, line => expect(line).toContain('↑'), numLines(2));
    await consume(output, line => expect(line).toMatch(
      matcher.startsWith(`* ${database} 20191124331980_data.js`),
    ), numLines(1));
    expect(await exitCode).toBe(0);
  }
});
