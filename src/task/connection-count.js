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

  return db.thisDb() === databaseName
    ? numConnections - 1
    : numConnections;
};
