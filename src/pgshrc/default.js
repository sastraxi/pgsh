module.exports = {
  mode: 'url', /* or 'split', */
  vars: {
    /* for url mode */
    url: 'DATABASE_URL',

    /* for split mode */
    host: 'POSTGRES_HOST',
    port: 'POSTGRES_PORT',
    user: 'POSTGRES_USER',
    password: 'POSTGRES_PASSWORD',
    database: 'POSTGRES_DATABASE',

    /* if you need a different login for super-user tasks, use this */
    /* super_user: 'PG_SUPER_USER', */
    /* super_password: 'PG_SUPER_PASSWORD', */
  },
  migrations: { /* passed to knex */
    path: 'migrations',
    schema: 'public',
    table: 'knex_migrations',
  },
  protected: ['master'], /* don't destroy these branches */
  /* by default filter: is undefined; default "pgsh list" prefix */
  template: 'template1', /* when creating databases */
  dotenv_encoding: 'utf8', /* parse/encode .env in this encoding */
};
