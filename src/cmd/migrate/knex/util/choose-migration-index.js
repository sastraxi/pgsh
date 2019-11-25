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

module.exports = db => async (migrationNames, userInput) => {
  console.log('names', migrationNames);
  const exactIndex = migrationNames.findIndex(n => n.startsWith(`${userInput}_`));
  if (exactIndex !== -1) {
    return exactIndex;
  }

  const autocompleted = migrationNames.filter(n => n.startsWith(userInput));
  if (autocompleted.length === 0) {
    console.error(
      `Couldn't find migration <${userInput}>`,
      'in your migrations folder',
      `(${c.underline(`${db.getMigrationsPath()}/`)})`,
    );
    return process.exit(2);
  }

  try {
    // value: 0 is making the message come back instead, so
    // work around it by never sending 0 as the value
    const choices = autocompleted.map((m, i) => ({
      value: i + 1,
      message: m,
    }));
    const index = await pick('Which migration did you mean?', choices) - 1;
    debug(`pgsh down based on prefix match ${userInput} => ${migrationNames[index]}`);
    return index;
  } catch (err) {
    console.log(err);
    console.log('Aborted due to user input!');
    return process.exit(1);
  }
};
