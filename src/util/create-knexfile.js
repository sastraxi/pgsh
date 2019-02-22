const tmp = require('tmp');
const fs = require('fs');

const createKnexfile = db => () => {
  const { config } = db;
  const contents = `
    module.exports = {
      client: 'pg',
      connection: '${db.thisUrl()}',
      migrations: {
        tableName: '${config.migrations.table || 'knex_migrations'}',
        ${config.migrations.schema ? `schemaName: '${config.migrations.schema}',\n` : ''}
        directory: '${db.getMigrationsPath()}'
      },
    };
  `;

  const path = tmp.fileSync({
    prefix: 'knexfile-',
    postfix: '.js',
    keep: false, // destroyed upon process exit
  }).name;

  fs.writeFileSync(path, contents, { encoding: 'utf8' });
  return path;
};

module.exports = createKnexfile;
