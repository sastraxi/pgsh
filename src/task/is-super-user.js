const debug = require('debug')('pgsh:is-super-user');

module.exports = db => async () => {
  const knex = db.connect(db.fallbackUrl());

  const isSuperUser = await knex('pg_user')
    .whereRaw('usename = CURRENT_USER')
    .first('usesuper')
    .then(x => x.usesuper);

  return new Promise((resolve, reject) => {
    knex.destroy((err) => {
      if (err) {
        debug('could not destroy', err);
        reject();
      } else {
        resolve(isSuperUser);
      }
    });
  });
};
