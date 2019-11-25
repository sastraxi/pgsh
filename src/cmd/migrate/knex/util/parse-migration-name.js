const path = require('path');

const MIGRATION_FILENAME_REGEX = new RegExp(
  '(0*)([A-Za-z0-9]+)[_](.+)',
  'i',
);

module.exports = (dir, filename) => {
  const match = MIGRATION_FILENAME_REGEX.exec(filename);
  if (!match) {
    return console.warn(`Skipping non-migration ${filename}`);
  }
  const [_full, zeroes, textualNumber, suffix] = match; // eslint-disable-line no-unused-vars
  return {
    id: textualNumber,
    name: filename,
    prefix: `${zeroes}${textualNumber}`,
    fullPath: path.join(dir, filename),
    suffix,
  };
};
