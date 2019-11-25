const debug = require('debug')('integration:db:reset');

const list = require('./list');

// do not drop these databases ever.
const DATABASE_BLACKLIST = [
  process.env.DANGER_INTEGRATION_DATABASE,
  'postgres',
  'template0',
  'template1',
];

/**
 * WARNING!
 * This code drops the entire database, and is only active
 * if the DANGER_INTEGRATION_RESET=nuke flag is set.
 *
 * Please be careful :-)
 */
const resetEntireDatabase = async (ctx) => {
  if (process.env.DANGER_INTEGRATION_RESET !== 'nuke') {
    throw new Error(
      'Please set DANGER_INTEGRATION_RESET=nuke to nuke the database, '
        + 'after ensuring that you do not need any data from that server.',
    );
  }

  // find all databases, filter down to those we should delete
  const targets = (await list(ctx))
    .filter(name => !DATABASE_BLACKLIST.find(db => db === name));

  const knex = ctx.connectAsSuper();
  await Promise.all(
    targets.map(
      target => knex.raw(`drop database "${target}"`),
    ),
  );

  return new Promise(resolve =>
    knex.destroy(() => {
      debug(`Dropped ${targets.length} databases.`);
      resolve();
    }));
};

module.exports = resetEntireDatabase;
