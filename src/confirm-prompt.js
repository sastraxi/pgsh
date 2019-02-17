const readline = require('readline');

module.exports = (prompt, expectedAnswer) => {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve, reject) =>
    rl.question(prompt, (answer) => {
      rl.close();
      if (answer === expectedAnswer) {
        resolve();
      } else {
        reject();
      }
    }));
};
