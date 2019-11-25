const c = require('ansi-colors');
const moment = require('moment');

module.exports = (db, { name, iso }) => {
  const timestamp = raw => (iso
    ? moment(raw).format()
    : moment(raw).fromNow()
  );

  const schema = db.config.migrations.schema || 'public';
  const table = db.config.migrations.table || 'knex_migrations';

  return async () => {
    const knex = db.connect(name ? db.thisUrl(name) : db.thisUrl());
    try {
      const latest = await knex(`${schema}.${table}`)
        .orderBy('id', 'desc')
        .first('name', 'migration_time');

      if (latest) {
        console.log(
          `* ${c.yellowBright(name || db.thisDb())}`
            + ` ${c.underline(c.greenBright(latest.name))}`
            + ` ${c.blueBright(timestamp(latest.migration_time))}`,
        );
      } else {
        console.log(`* ${c.yellowBright(name || db.thisDb())}`);
      }
    } catch (err) {
      console.log(`* ${c.yellowBright(name || db.thisDb())}`);
    }
    return new Promise(resolve =>
      knex.destroy(() => {
        resolve();
      }));
  };
};
