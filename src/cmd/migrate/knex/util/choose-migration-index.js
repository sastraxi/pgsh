const c = require('ansi-colors');
const debug = require('debug')('pgsh:knex:choose-migration');
const { prompt } = require('enquirer');

const endProgram = require('../../../../end-program');

const parseMigrationName = require('./parse-migration-name');

const pick = async (message, choices) => {
  const { choice } = await prompt({
    type: 'select',
    name: 'choice',
    message,
    choices: choices.sort(),
  });
  return choice;
};

module.exports = db => async (migrationNames, userInput) => {
  const migrations = migrationNames.map(name => parseMigrationName('', name));

  const exactIndex = migrations.findIndex(m => m.id === userInput || m.prefix === userInput);
  if (exactIndex !== -1) {
    return exactIndex;
  }

  const autocompleted = migrations
    .filter(m => m.id.startsWith(userInput) || m.suffix.startsWith(userInput));
  if (autocompleted.length === 0) {
    console.error(
      `Couldn't find migration <${userInput}>`,
      'in your migrations folder',
      `(${c.underline(`${db.getMigrationsPath()}/`)})`,
    );
    return endProgram(25);
  }

  if (autocompleted.length === 1) {
    return migrations.indexOf(autocompleted[0]);
  }

  try {
    const choices = autocompleted.map(m => ({
      value: m.name,
      message: m.name,
    }));
    const chosenName = await pick('Which migration did you mean?', choices);
    const index = migrationNames.indexOf(chosenName);
    debug(`pgsh down based on prefix match ${userInput} => ${migrationNames[index]}`);
    return index;
  } catch (err) {
    console.error(err);
    console.log('Aborted due to user input!');
    return endProgram(26);
  }
};
