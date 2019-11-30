const connect = require('./connect');

const DEFAULT_DB_NAMES_OPTIONS = {
  showBuiltIn: false,
  showTemplates: false,
  sortByCreation: false,
};

const SORT_CREATION = (a, b) => -a.created_at.localeCompare(b.created_at);
const SORT_NAME = (a, b) => a.name.localeCompare(b.name);

const BUILT_IN_DATABASES = [
  'postgres',
];

const excludingBuiltins = name =>
  BUILT_IN_DATABASES.indexOf(name) === -1;

const databaseNames = async (url, options) => {
  const {
    showBuiltIn,
    showTemplates,
    sortByCreation,
  } = { ...DEFAULT_DB_NAMES_OPTIONS, ...(options || {}) };

  const db = connect(url);
  const names = await db.raw(`
    SELECT
      datname as name,
      (pg_stat_file('base/'||oid ||'/PG_VERSION')).modification::text as created_at
    FROM pg_database
    WHERE datistemplate = ?
  `, [showTemplates])
    .then(({ rows }) => rows
      .sort(sortByCreation ? SORT_CREATION : SORT_NAME)
      .map(row => row.name));

  await new Promise(resolve => db.destroy(resolve));
  return showBuiltIn ? names : names.filter(excludingBuiltins);
};

module.exports = databaseNames;
