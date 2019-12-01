const moment = require('moment');

let time = null;

module.exports = {
  start: () => {
    time = +moment();
  },
  get: () => time,
};
