const fs = require('fs');
const findConfig = require('find-config');
const path = findConfig('.pgshrc');

module.exports = path
  ? JSON.parse(fs.readFileSync(path))
  : null;

