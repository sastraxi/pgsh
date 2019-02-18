const path = require('path');
const fs = require('fs');

/**
 * Starting at the process' current working directory,
 * attempt to find a directory with exactly the given name,
 * then return its absolute path.
 *
 * Returns null if the directory couldn't be found.
 */
module.exports = (dirName) => {
  if (path.isAbsolute(dirName)) return dirName;

  let currentDirectory = process.cwd();
  while (true) {
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
