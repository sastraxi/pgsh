
const getTables = async (ctx) => {

  const knex = ctx.connect();

  return new Promise(resolve =>
    knex.destroy(() => {
      resolve(showBuiltIn ? names : names.filter(excludingBuiltins));
    }));
};
