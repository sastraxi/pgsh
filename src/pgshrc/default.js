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
  migrations: {
    backend: undefined,       /* needs to be detected; no default */
    path: 'migrations',       /* knex */
    schema: 'public',         /* knex */
    table: 'knex_migrations', /* knex */
  },
  protected: ['master'], /* don't destroy these branches */
  /* by default filter: is undefined; default "pgsh list" prefix */
  template: 'template1', /* when creating databases */
  fallback_database: 'postgres', /* if connecting to the named database fails, for e.g. listing */
  dotenv_encoding: 'utf8', /* parse/encode .env in this encoding */
  force_disable_telemetry: false,
};
