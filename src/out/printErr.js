const error = require('./err');

module.exports = (...args) =>
  console.error(error(...args));
