const fs = require('fs');
const path = require('path');
const xdg = require('@folder/xdg');
const { exec } = require('child_process');

const debug = require('debug')('pgsh:metrics');

const dirs = xdg();
fs.mkdirSync(dirs.data, { recursive: true });
const FILE_PATH = path.join(dirs.data, 'pgsh_metrics_store.ndjson');

if (!fs.existsSync(FILE_PATH)) {
  fs.writeFileSync(FILE_PATH, '');
}
debug('global data path', FILE_PATH);

const TEMP = `${FILE_PATH}_bak`;

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
      exec(`head -n ${max} ${FILE_PATH}`, (err, stdout, stderr) => {
        if (err) {
          console.error(err, stderr);
          return reject(err);
        }
        return resolve(stdout);
      });
    }),

  put: (sample) =>
    fs.appendFileSync(FILE_PATH, `${JSON.stringify(sample)}\n`),

  discard: (num) =>
    new Promise((resolve, reject) => {
      exec(`
        mv ${FILE_PATH} ${TEMP} &&
        tail -n +${num + 1} ${TEMP} > ${FILE_PATH}
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
