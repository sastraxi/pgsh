const fs = require('fs');
const path = require('path');
const quickHash = require('../util/quick-hash');

let commandLine = null;

const hidePath = (str) => {
  if (fs.existsSync(str)) {
    return path.basename(str);
  }
  return str;
};

module.exports = {
  set: (...sensitiveStrings) => {
    const args = process.argv;

    if (args.length >= 2) {
      args[0] = hidePath(args[0]);
    }

    if (args.length >= 3) {
      args[1] = hidePath(args[1]);
    }

    commandLine = args.map(x =>
      (sensitiveStrings.indexOf(x) !== -1
        ? quickHash(x)
        : x));
  },
  get: () => commandLine,
};
