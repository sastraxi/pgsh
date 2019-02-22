const pick = require('lodash.pick');

// modified from https://github.com/vitaly-t/connection-string
// to be simpler and only support what pg-connection-string gives us

const DEFAULT_PROTOCOL = 'postgres';

const encode = (text, { encodeDollar }) => {
  const encoded = encodeURIComponent(`${text}`);
  return encodeDollar ? encoded : encoded.replace(/%24/g, '$');
};

module.exports = function buildUrl(options = {}) {
  const {
    protocol,
    user, password,
    host, port,
    database,
    ...restOptions
  } = options;


  let s = `${encode(protocol || DEFAULT_PROTOCOL, options)}://`;

  if (user) {
    s += encode(user, options);
    if (password) {
      s += `:${encode(password, options)}`;
    }
    s += '@';
  } else if (password) {
    s += `:${encode(password, options)}@`;
  }

  s += host;
  if (port) {
    s += `:${port}`;
  }

  s += `/${encode(database, options)}`;

  // all the query params that pg-connection-string throws in our options
  const query = pick(restOptions, [
    'application_name',
    'fallback_application_name',
    'ssl',
  ]);
  query.encoding = options.client_encoding;

  if (Object.values(query).filter(x => x).length > 0) {
    const encodedQuery = Object.entries(query)
      .map(([key, value]) => {
        if (!value) return null;
        return `${encode(key, options)}=${encode(value, options)}`;
      })
      .filter(str => str)
      .sort(); // predictable output ordering

    if (encodedQuery.length) {
      s += `?${encodedQuery.join('&')}`;
    }
  }
  return s;
};
