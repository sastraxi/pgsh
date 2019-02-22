const c = require('ansi-colors');
const moment = require('moment');

module.exports = (db, { iso }) => {
  const timestamp = raw => (iso
    ? moment(raw).format()
    : moment(raw).fromNow()
  );

  const schema = db.config.migrations.schema || 'public';
  const table = db.config.migrations.table || 'knex_migrations';

  return async () => {
    const knex = db.connect();
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
