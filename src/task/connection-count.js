const debug = require('debug')('pgsh:util:connection-count');

/**
 * Returns the number of connections to the given database,
 * without counting this one (if we're connecting to the same db).
 */
module.exports = db => async (databaseName) => {
  const knex = db.connectAsSuper();

  const numConnections = await knex.raw(`
    select count(*) as connections
    from pg_stat_activity
    where datname = ?
  `, [databaseName])
    .then(({ rows }) => +rows[0].connections);

  console.log(numConnections, db.thisDb(), databaseName);

  const otherConnections = db.thisDb() === databaseName
    ? numConnections - 1
    : numConnections;

  await new Promise((resolve, reject) => {
    knex.destroy((err) => {
      if (err) {
        debug('could not destroy', err);
        reject();
      } else {
        resolve();
      }
    });
  });

  return otherConnections;
};
