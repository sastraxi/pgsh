const debug = require('debug')('pgsh:validate');
const config = require('../../../../config');

const getAppliedMigrations = async (knex) => {
  const SCHEMA = config.migrations.schema || 'public';
  const TABLE = config.migrations.table || 'knex_migrations';
  try {
    const files = await knex(`${SCHEMA}.${TABLE}`)
      .orderBy('id', 'desc')
      .select('id', 'name');

    return files;
  } catch (err) {
    debug('could not list applied migrations', err);
    return [];
  }
};

module.exports = getAppliedMigrations;
