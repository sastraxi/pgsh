const { set: setCommandLine } = require('../metrics/command-line');
const endProgram = require('../end-program');

exports.command = 'url';
exports.desc = 'prints your current connection string';

exports.builder = {};

exports.handler = () => {
  setCommandLine();

  const db = require('../db')();
  console.log(db.thisUrl());

  endProgram(0);
};
