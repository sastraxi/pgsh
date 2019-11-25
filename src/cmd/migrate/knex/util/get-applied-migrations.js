const debug = require('debug')('pgsh:validate');
const config = require('../../../../config');

const getAppliedMigrations = async (knex) => {
  const SCHEMA = config.migrations.schema || 'public';
  const TABLE = config.migrations.table || 'knex_migrations';
  try {
    const { rows } = await knex.raw(`
      select id, name from ${SCHEMA}.${TABLE}
      order by
        split_part(name, '_', 1) desc;
    `);
    return rows;
  } catch (err) {
    debug('could not list applied migrations', err);
    return [];
  }
};

module.exports = getAppliedMigrations;
