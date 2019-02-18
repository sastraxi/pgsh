const chalk = require('chalk');
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
      `* ${chalk.yellowBright(db.thisDb())}`
        + ` ${chalk.underline(chalk.greenBright(latest.name))}`
        + ` ${chalk.blueBright(timestamp(latest.migration_time))}`,
    );
  };
};
