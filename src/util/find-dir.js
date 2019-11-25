const path = require('path');
const fs = require('fs');

/**
 * Starting at a given directory, attempt to find a sub-directory
 * with exactly the given name, then return its absolute path.
 *
 * Returns null if the directory couldn't be found.
 * @param {startDir} the directory to start the search in
 *                   (defaults to process.cwd())
 */
module.exports = (dirName, startDir = process.cwd()) => {
  if (path.isAbsolute(dirName)) return dirName;

  let currentDirectory = startDir;
  while (true) { // eslint-disable-line no-constant-condition
    // is the directory here?
    const candidate = path.join(currentDirectory, dirName);
    if (fs.existsSync(candidate) && fs.lstatSync(candidate).isDirectory()) {
      return path.resolve(candidate);
    }

    // keep going up until we can't anymore
    const nextDirectory = path.join(currentDirectory, '..');
    if (currentDirectory === nextDirectory) break;
    currentDirectory = nextDirectory;
  }
  return null;
};
