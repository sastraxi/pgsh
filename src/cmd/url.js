const db = require('../db');

exports.command = 'url';
exports.desc = 'prints your current connection string';

exports.builder = {};

exports.handler = () => {
  console.log(db.thisUrl());
  process.exit(0);
};
