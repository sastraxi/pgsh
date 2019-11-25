const c = require('ansi-colors');
const debug = require('debug')('pgsh:knex:choose-migration');
const { prompt } = require('enquirer');

// const CHOICES = [{ value, message }];

const pick = async (message, choices) => {
  const { choice } = await prompt({
    type: 'select',
    name: 'choice',
    message,
    choices: choices.sort(),
  });
  return choice;
};

module.exports = db => async (vcsMigrations, userInput) => {
  const exactIndex = vcsMigrations.findIndex(m => m.id === userInput);
  if (exactIndex !== -1) {
    return exactIndex;
  }

  const autocompleted = vcsMigrations.filter(m => `${m.id}`.startsWith(`${userInput}`));
  if (autocompleted.length === 0) {
    console.error(
      `couldn't find migration <${userInput}>`,
      'in your migrations folder',
      `(${c.underline(`${db.getMigrationsPath()}/`)})`,
    );
    return process.exit(2);
  }

  try {
    const chosenName = await pick('Which migration did you mean?', autocompleted.map(m => m.name));
    const index = vcsMigrations.findIndex(m => m.name === chosenName);
    debug(`pgsh down based on prefix match ${userInput} => ${vcsMigrations[index].name}`);
    return index;
  } catch (err) {
    console.log('Aborted due to user input!');
    return process.exit(1);
  }
};
