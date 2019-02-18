/* eslint-disable quote-props */
const Table = require('cli-table');

const TABLE_OPTIONS = {
  chars: {
    'top': '',
    'top-mid': '',
    'top-left': '',
    'top-right': '',
    'bottom': '',
    'bottom-mid': '',
    'bottom-left': '',
    'bottom-right': '',
    'left': '',
    'left-mid': '',
    'mid': '',
    'mid-mid': '',
    'right': '',
    'right-mid': '',
    'middle': ' ',
  },
  style: {
    'padding-left': 0,
    'padding-right': 0,
  },
};

module.exports = (rows) => {
  const table = new Table(TABLE_OPTIONS);
  table.push(...rows);
  console.log(table.toString());
};

/* eslint-enable quote-props */
