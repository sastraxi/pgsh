exports.command = 'url';
exports.desc = 'prints your current connection string';

exports.builder = {};

exports.handler = () => {
  const db = require('../db');
  console.log(db.thisUrl());
  process.exit(0);
};
