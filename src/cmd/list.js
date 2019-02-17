const chalk = require('chalk');
const config = require ('../config');
const db = require('../db');

exports.command = 'list [prefix]';
exports.desc = 'prints all databases, filtered by an optional prefix';

exports.builder = yargs =>
  yargs.positional('prefix', {
    describe: 'only list databases that start with the given string',
    type: 'string',
    default: config.prefix ? `${config.prefix}_` : '',
  });

const IGNORE_DATABASES = ["postgres"];

exports.handler = async function ({ prefix }) {
  const databaseNames = await db.databaseNames();
  const current = db.thisDb();

  databaseNames
    .filter(x => !IGNORE_DATABASES.includes(x))
    .filter(x => !prefix || x.startsWith(prefix))
    .forEach((name) => {
      if (name === current) {
        console.log(`* ${chalk.greenBright(name)}`)
      } else {
        console.log(`  ${name}`);
      }
    });

  process.exit(0);
};
