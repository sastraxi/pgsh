const { set: setCommandLine } = require('../metrics/command-line');
const endProgram = require('../end-program');

exports.command = 'current';
exports.desc = 'prints the name of the database that your connection string refers to right now';

exports.builder = {};

exports.handler = () => {
  const db = require('../db')();
  console.log(db.thisDb());

  setCommandLine();
  return endProgram(0);
};
