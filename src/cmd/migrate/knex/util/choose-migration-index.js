const c = require('ansi-colors');
const debug = require('debug')('pgsh:knex:choose-migration');

module.exports = db => (vcsMigrations, userInput) => {
  let destVcsIndex = vcsMigrations.findIndex(m => m.id === userInput);
  if (destVcsIndex === -1) {
    destVcsIndex = vcsMigrations.findIndex(m => `${m.id}`.startsWith(`${userInput}`));
    if (destVcsIndex === -1) {
      console.error(
        `couldn't find migration <${userInput}>`,
        'in your migrations folder',
        `(${c.underline(`${db.getMigrationsPath()}/`)})`,
      );
      process.exit(2);
    } else {
      debug(`pgsh down based on prefix match ${userInput} => ${vcsMigrations[destVcsIndex].name}`);
    }
  }
  return destVcsIndex;
};
