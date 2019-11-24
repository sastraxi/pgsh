const debug = require('debug')('integration:db:list');

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

const databaseNames = async (ctx, options) => {
  const {
    showBuiltIn,
    showTemplates,
    sortByCreation,
  } = { ...DEFAULT_DB_NAMES_OPTIONS, ...(options || {}) };

  const getNames = async (url = ctx.url) => {
    const db = ctx.connectAsSuper(url);
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
    return showBuiltIn ? names : names.filter(excludingBuiltins);
  };

  // first attempt to connect to the given database;
  // if that does not work, fall back to the built-in "postgres"
  try {
    const names = await getNames();
    return names;
  } catch (err) {
    debug('encountered error; using fallback url instead', err);
    return getNames(ctx.fallbackUrl);
  }
};

module.exports = databaseNames;
