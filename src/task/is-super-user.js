module.exports = db => async () => {
  const knex = db.connect(db.fallbackUrl());

  const isSuperUser = await knex('pg_user')
    .whereRaw('usename = CURRENT_USER')
    .first('usesuper')
    .then(x => x.usesuper);

  return isSuperUser;
};
