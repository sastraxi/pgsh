const fs = require('fs');
const findConfig = require('find-config');
const dotenv = require('dotenv');
const c = require('ansi-colors');

module.exports = {
  config: (options) => {
    const envConfig = dotenv.parse(fs.readFileSync(findConfig('.env')), options);

    // check if any of our .env vars are set in our execution context
    let conflicts = 0;
    Object.keys(envConfig).forEach((k) => {
      if (k in process.env) {
        console.error(`${c.red('FATAL:')} ${c.whiteBright(k)}=${process.env[k]}`);
        conflicts += 1;
      }
      process.env[k] = envConfig[k];
    });

    // there's too much opportunity for subtle, hard-to-trace bugs
    if (conflicts > 0) {
      const noun = (conflicts === 1 ? 'this variable' : 'these variables');
      console.error(`\nUNSET ${noun} before running ${c.yellowBright('pgsh')} here.`);
      process.exit(14);
    }
  },
};
