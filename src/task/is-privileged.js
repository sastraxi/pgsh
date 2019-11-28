const debug = require('debug')('pgsh:is-priviliged');

const CAP_CHECK = {
  // used in db.getNames(...)
  pg_stat_file: (knex) => knex('information_schema.role_routine_grants')
    .whereRaw(`
      grantee = CURRENT_USER and routine_name = 'pg_stat_file'
    `)
    .first('privilege_type')
    .then(x => (x ? x.privilege_type.trim().toLowerCase() === 'execute' : false)),

  // used in lots of places
  createdb: knex => knex('pg_user')
    .whereRaw('usename = CURRENT_USER')
    .first('usecreatedb')
    .then(x => x.usecreatedb),
};

module.exports = db => async (caps = ['createdb']) => {
  const knex = db.connect(db.fallbackUrl());

  const unknownCapability = caps.find(cap => !(cap in CAP_CHECK));
  if (unknownCapability) {
    throw new Error(`Unknown capability: ${unknownCapability}`);
  }

  const privileges = (await Promise.all(
    caps.map(cap =>
      CAP_CHECK[cap](knex)),
  ));

  // every capability must be granted
  const isPrivileged = privileges.reduce((a, b) => a && b, true);

  return new Promise((resolve, reject) => {
    knex.destroy((err) => {
      if (err) {
        debug('could not destroy', err);
        reject();
      } else {
        resolve(isPrivileged);
      }
    });
  });
};
