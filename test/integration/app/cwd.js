const path = require('path');
const fs = require('fs');

module.exports = (app) => {
  const dir = path.join(__dirname, app);
  if (!fs.lstatSync(dir).isDirectory()) {
    throw new Error(`Unknown app ${app}!`);
  }

  return dir;
};
