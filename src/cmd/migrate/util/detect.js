const knex = require('../knex/detect');

module.exports = async () => {
  if (await knex()) return 'knex';
  return undefined;
};
