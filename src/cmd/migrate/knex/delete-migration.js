const debug = require('debug')('pgsh:validate');
const config = require('../../../config');

const deleteMigration = async (knex, id) => {
  const SCHEMA = config.migrations.schema || 'public';
  const TABLE = config.migrations.table || 'knex_migrations';
  try {
    await knex.raw(`delete from ${SCHEMA}.${TABLE} where id = ?`, [id]);
    return true;
  } catch (err) {
    debug('could not delete migration', err);
    return false;
  }
};

module.exports = deleteMigration;
