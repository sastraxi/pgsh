const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

module.exports = (prompt, expectedAnswer) =>
  new Promise((resolve, reject) =>
    rl.question(prompt, (answer) => {
      if (answer === expectedAnswer) {
        resolve();
      } else {
        reject();
      }
    }));
