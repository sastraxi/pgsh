const mergeOptions = require('merge-options');
const moment = require('moment');
const fs = require('fs');

const pgshGlobal = require('../../src/global');
const {
  METRICS_ENABLED,
  METRICS_LAST_SENT,
  METRICS_UPLOAD_PERIOD_SEC,
} = require('../../src/global/keys');
const randomString = require('../../src/util/random-string');
const { SERVER_URL } = require('../../src/metrics/constants');

const makeContext = require('./util/context');
const readMetrics = require('./util/read-metrics');
const resetMetrics = require('./util/reset-metrics');
const integrationDb = require('./db/integration-db');
const { consume, numLines } = require('./util/stream-utils');

const APP = 'knexapp';
const cwd = require('./app/cwd')(APP);
const { env, config: telemetryDisabledConfig } = require('./app/dotfiles')(APP);

const config = mergeOptions(telemetryDisabledConfig, {
  force_disable_metrics: false,
});

it('enables telemetry from clean global config', async () => {
  pgshGlobal.set(METRICS_ENABLED, undefined);
  pgshGlobal.set(METRICS_LAST_SENT, undefined);
  const ctx = makeContext(cwd, config, env);
  const { pgsh } = ctx;

  const { send, exitCode, output } = pgsh('current');
  await consume(output, line => expect(line).toEqual(integrationDb), numLines(1));
  await send.down(); // opt in
  await send.enter();

  expect(await exitCode).toBe(0);
  expect(pgshGlobal.get(METRICS_ENABLED)).toEqual(true);
});

it('disables telemetry from clean global config', async () => {
  pgshGlobal.set(METRICS_ENABLED, undefined);
  pgshGlobal.set(METRICS_LAST_SENT, undefined);
  const ctx = makeContext(cwd, config, env);
  const { pgsh } = ctx;

  const { send, exitCode, output } = pgsh('current');
  await consume(output, line => expect(line).toEqual(integrationDb), numLines(1));
  await send.enter(); // opt out

  expect(await exitCode).toBe(0);
  expect(pgshGlobal.get(METRICS_ENABLED)).toEqual(false);
});

it('does not ask for opt-in when running with clean config and force_disable_telemetry', async () => {
  pgshGlobal.set(METRICS_ENABLED, undefined);
  pgshGlobal.set(METRICS_LAST_SENT, undefined);
  const ctx = makeContext(cwd, telemetryDisabledConfig, env);
  const { pgsh } = ctx;

  const { exitCode, output } = pgsh('current');
  await consume(output, line => expect(line).toEqual(integrationDb), numLines(1));
  expect(await exitCode).toBe(0);

  expect(pgshGlobal.get(METRICS_ENABLED)).toEqual(undefined);
});

it('pgsh metrics on turns on metrics and disables force_disable_telemetry', async () => {
  pgshGlobal.set(METRICS_ENABLED, false);
  pgshGlobal.set(METRICS_LAST_SENT, undefined);
  const ctx = makeContext(cwd, telemetryDisabledConfig, env);
  const { pgsh } = ctx;

  const { exitCode, output } = pgsh('metrics', 'on');
  await consume(output, line => expect(line).toEqual(
    'Telemetry is now enabled globally.',
  ), numLines(1));
  await consume(output, line => expect(line).toEqual(
    'Removed force_disable_metrics from .pgshrc.',
  ), numLines(1));
  expect(await exitCode).toBe(0);

  // ensure metrics were globally enabled
  expect(pgshGlobal.get(METRICS_ENABLED)).toEqual(true);

  // ensure metrics were locally enabled
  const writtenConfig = fs.readFileSync(`${cwd}/.pgshrc`, { encoding: 'utf8' });
  const { force_disable_metrics: forceDisableMetrics } = JSON.parse(writtenConfig);
  expect(forceDisableMetrics).toEqual(false);
});

it('pgsh metrics off turns off metrics', async () => {
  pgshGlobal.set(METRICS_ENABLED, true);
  pgshGlobal.set(METRICS_LAST_SENT, undefined);
  const ctx = makeContext(cwd, config, env);
  const { pgsh } = ctx;

  const { exitCode, output } = pgsh('metrics', 'off');
  await consume(output, line => expect(line).toEqual(
    'Telemetry is now disabled globally.',
  ), numLines(1));
  expect(await exitCode).toBe(0);

  // ensure metrics were globally enabled
  expect(pgshGlobal.get(METRICS_ENABLED)).toEqual(false);

  // ensure metrics not locally disabled
  const writtenConfig = fs.readFileSync(`${cwd}/.pgshrc`, { encoding: 'utf8' });
  const { force_disable_metrics: forceDisableMetrics } = JSON.parse(writtenConfig);
  expect(forceDisableMetrics).toEqual(false);
});

it('pgsh clone writes to log, obscuring database names and outputting correct error code', async () => {
  pgshGlobal.set(METRICS_ENABLED, true);
  pgshGlobal.set(METRICS_LAST_SENT, +moment().add(1, 'day'));
  pgshGlobal.set(METRICS_UPLOAD_PERIOD_SEC, +moment().add(1, 'month')); // ensure we don't upload
  const ctx = makeContext(cwd, config, env);
  const { pgsh } = ctx;

  // capture calls to the server
  let requestCount = 0;
  const scope = nock(SERVER_URL)
    .persist()
    .get('/')
    .reply(200, (body) => {
      requestCount += 1;
      return JSON.stringify({
        insert: body.split('\n').filter(x => x.trim() !== '').length,
      });
    });

  // remove history of all metrics
  resetMetrics();

  const databaseName = randomString();
  let hashedName;
  { // create, but don't switch
    const { exitCode } = pgsh('clone', databaseName, '--no-switch');
    expect(await exitCode).toEqual(0);

    const metrics = readMetrics();
    expect(metrics.length).toEqual(1);

    // FIXME: version is knexapp/package.json's version right now :/
    const { exitCode: recordedExitCode, command } = metrics[0];
    expect(recordedExitCode).toEqual(0);
    expect(command[0]).toEqual('node');
    expect(command[1]).toEqual('index.js');
    expect(command[2]).toEqual('clone');
    expect(command[3]).not.toEqual(databaseName); // must be hashed somehow!
    expect(command[4]).toEqual('--no-switch');
    hashedName = command[3]; // eslint-disable-line
  }
  {
    const { exitCode } = pgsh('switch', databaseName);
    expect(await exitCode).toEqual(0);

    const metrics = readMetrics();
    expect(metrics.length).toEqual(2);

    const { exitCode: recordedExitCode, command } = metrics[1];
    expect(recordedExitCode).toEqual(0);
    expect(command[0]).toEqual('node');
    expect(command[1]).toEqual('index.js');
    expect(command[2]).toEqual('switch');
    expect(command[3]).toEqual(hashedName); // hash must be consistent!
  }
  {
    const { exitCode } = pgsh('switch', databaseName);
    expect(await exitCode).toEqual(2);

    const metrics = readMetrics();
    expect(metrics.length).toEqual(3);

    const { exitCode: recordedExitCode, command } = metrics[2];
    expect(recordedExitCode).toEqual(2);
    expect(command[0]).toEqual('node');
    expect(command[1]).toEqual('index.js');
    expect(command[2]).toEqual('switch');
    expect(command[3]).toEqual(hashedName); // hash must be consistent!
  }

  // make sure we didn't actually send anything!
  expect(requestCount).toEqual(0);
  scope.persist(false);
});

// it('setting upload period to 0 => upload at start of next command', async () => {
//   pgshGlobal.set(METRICS_ENABLED, true);
//   pgshGlobal.set(METRICS_LAST_SENT, undefined);
//   pgshGlobal.set(METRICS_UPLOAD_PERIOD_SEC, 0);
//   const ctx = makeContext(cwd, config, env);
//   const { pgsh } = ctx;

//   // capture calls to the server
//   let requestCount = 0;
//   let lastServerMetrics;
//   let lastWrittenMetric;
//   const scope = nock(SERVER_URL)
//     .persist()
//     .post('/')
//     .reply(200, (body) => {
//       requestCount += 1;
//       lastServerMetrics = body.split('\n').filter(x => x.trim() !== '').map(JSON.parse);
//       console.log('lsm', lastServerMetrics);
//       return JSON.stringify({
//         insert: lastServerMetrics.length,
//       });
//     });

//   // remove history of all metrics
//   resetMetrics();

//   {
//     const { exitCode } = pgsh('ls');
//     expect(await exitCode).toEqual(0);
//     expect(requestCount).toEqual(0);
//     expect(lastServerMetrics).toEqual(undefined);

//     const metrics = readMetrics();
//     expect(metrics.length).toEqual(1);
//     lastWrittenMetric = metrics[metrics.length - 1];
//   }
//   {
//     const { exitCode } = pgsh('current');
//     expect(await exitCode).toEqual(0);
//     expect(requestCount).toEqual(1);
//     expect(lastServerMetrics).toEqual([lastWrittenMetric]);

//     const metrics = readMetrics();
//     expect(metrics.length).toEqual(1);
//     lastWrittenMetric = metrics[metrics.length - 1];
//   }
//   {
//     const { exitCode } = pgsh('url');
//     expect(await exitCode).toEqual(0);
//     expect(requestCount).toEqual(2);
//     expect(lastServerMetrics).toEqual([lastWrittenMetric]);
//   }

//   scope.persist(false);
// });
