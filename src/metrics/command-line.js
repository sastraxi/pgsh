let commandLine = null;

const quickHash = require('../util/quick-hash');

module.exports = {
  set: (...sensitiveStrings) => {
    commandLine = process.argv.map(x =>
      (sensitiveStrings.indexOf(x) !== -1 ? quickHash(x) : x));
  },
  get: () => commandLine,
};
