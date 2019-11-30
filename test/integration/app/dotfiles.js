const APP_TO_CONFIG = {};
const APP_TO_ENV = {};

// -------------------------------------------------------------------------------
// knexapp
APP_TO_CONFIG.knexapp = {
  mode: 'split',
  vars: {
    host: 'KNEXAPP_DB_HOST',
    port: 'KNEXAPP_DB_PORT',
    user: 'KNEXAPP_DB_USER',
    password: 'KNEXAPP_DB_PASSWORD',
    database: 'KNEXAPP_DB_DATABASE',
  },
  migrations: {
    backend: 'knex',
  },
  force_disable_telemetry: true,
};
APP_TO_ENV.knexapp = {
  KNEXAPP_DB_DATABASE: process.env.DANGER_INTEGRATION_DATABASE,
  KNEXAPP_DB_HOST: process.env.DANGER_INTEGRATION_HOST,
  KNEXAPP_DB_PORT: process.env.DANGER_INTEGRATION_PORT,
  KNEXAPP_DB_USER: process.env.DANGER_INTEGRATION_USER,
  KNEXAPP_DB_PASSWORD: process.env.DANGER_INTEGRATION_PASSWORD,
};

// -------------------------------------------------------------------------------
module.exports = app => ({
  config: APP_TO_CONFIG[app],
  env: APP_TO_ENV[app],
});
