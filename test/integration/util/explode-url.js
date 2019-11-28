const { parse: parseUrl } = require('pg-connection-string');

const explodeUrl = (databaseUrl) => {
  const parsed = parseUrl(databaseUrl);
  Object.keys(parsed).forEach((key) => {
    if (parsed[key] === null) {
      parsed[key] = undefined; // nulls get coerced to "null" by psql
    }
  });
  return parsed;
};

module.exports = explodeUrl;
