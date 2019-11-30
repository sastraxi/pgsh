const knex = require('knex');
const explodeUrl = require('../util/explode-url');

module.exports = (url) =>
  knex({
    client: 'pg',
    connection: explodeUrl(url),
  });
