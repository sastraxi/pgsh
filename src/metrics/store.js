const fs = require('fs');
const { exec } = require('child_process');
const debug = require('debug')('pgsh:metrics');

const { STORE_PATH } = require('./constants');

if (!fs.existsSync(STORE_PATH)) {
  fs.writeFileSync(STORE_PATH, '');
}
debug('global data path', STORE_PATH);

const TEMP = `${STORE_PATH}_bak`;

const cleanupTemp = () =>
  new Promise((resolve, reject) => {
    exec(`rm ${TEMP}`, (err, stdout, stderr) => {
      if (err) {
        console.error(err, stderr);
        return reject(err);
      }
      return resolve(stdout);
    });
  });

module.exports = {
  get: (max) =>
    new Promise((resolve, reject) => {
      exec(`head -n ${max} ${STORE_PATH}`, (err, stdout, stderr) => {
        if (err) {
          console.error(err, stderr);
          return reject(err);
        }
        return resolve(stdout);
      });
    }),

  put: (sample) =>
    fs.appendFileSync(STORE_PATH, `${JSON.stringify(sample)}\n`),

  discard: (num) =>
    new Promise((resolve, reject) => {
      exec(`
        mv ${STORE_PATH} ${TEMP} &&
        tail -n +${num + 1} ${TEMP} > ${STORE_PATH}
      `, (err, stdout, stderr) => {
        if (err) {
          console.error(err, stderr);
          return reject(err);
        }
        return cleanupTemp().then(() =>
          resolve(stdout));
      });
    }),
};
