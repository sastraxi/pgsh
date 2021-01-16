const fs = require('fs');
const path = require('path');

const parentOf = p =>
  path.join(p, '..');

const exists = (p) => {
  try {
    fs.statSync(p);
    return true;
  } catch (err) {
    return false;
  }
};

/**
 * Checks if an existing file is a directory or not.
 * @param {string} p path to a file (or directory) that exists.
 */
const isDirectory = p =>
  fs.statSync(p).isDirectory();

/**
 * Create directories (and possibly their parents) recursively.
 * @param path string representing the path in the filesystem we want to create as a folder
 */
const mkdir = (p) => {
  if (!exists(parentOf(p))) {
    mkdir(parentOf(p));
  }

  if (!exists(p)) {
    fs.mkdirSync(p);
    return;
  }

  if (!isDirectory(p)) {
    throw new Error(`${p} exists, but is not a directory!`);
  }
};

module.exports = mkdir;
