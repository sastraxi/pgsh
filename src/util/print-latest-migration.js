const c = require('ansi-colors');
const moment = require('moment');
const config = require('../config');
const db = require('../db');

module.exports = ({ iso }) => {
  const timestamp = raw => (iso
    ? moment(raw).format()
    : moment(raw).fromNow()
  );

  const schema = config.migrations.schema || 'public';
  const table = config.migrations.table || 'knex_migrations';

  return async (knex) => {
    const latest = await knex(`${schema}.${table}`)
      .orderBy('id', 'desc')
      .first('name', 'migration_time');

    console.log(
      `* ${c.yellowBright(db.thisDb())}`
        + ` ${c.underline(c.greenBright(latest.name))}`
        + ` ${c.blueBright(timestamp(latest.migration_time))}`,
    );
  };
};
