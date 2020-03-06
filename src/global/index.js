const fs = require('fs');
const debug = require('debug')('pgsh:metrics');
const path = require('path');
const xdg = require('@folder/xdg');
const mkdirp = require('../util/mkdirp');

const dirs = xdg();
mkdirp(dirs.config);

const GLOBAL_CONFIG_PATH = path.join(dirs.config, 'pgsh_global.json');
debug('global config path', GLOBAL_CONFIG_PATH);

const ensureExists = () => {
  if (!fs.existsSync(GLOBAL_CONFIG_PATH)) {
    fs.writeFileSync(GLOBAL_CONFIG_PATH, '{}');
  }
};

const readAsObject = () =>
  JSON.parse(fs.readFileSync(GLOBAL_CONFIG_PATH));

const writeObject = (obj) =>
  fs.writeFileSync(GLOBAL_CONFIG_PATH, JSON.stringify(obj, null, 2));

module.exports = {
  get: (key, defaultValue) => {
    ensureExists();
    const obj = readAsObject();
    if (!key) return obj;
    return key in obj ? obj[key] : defaultValue;
  },

  set: (key, value) => {
    ensureExists();
    const obj = readAsObject();
    obj[key] = value;
    writeObject(obj);
  },
};
