const db = require('../db');

exports.command = 'current';
exports.desc = 'prints the name of the database that your connection string refers to right now';

exports.builder = {};

exports.handler = () => {
  console.log(db.thisDb());
  process.exit(0);
};
