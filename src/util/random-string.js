/* eslint-disable no-bitwise */

// from https://gist.github.com/6174/6062387
const randomString = (len = 16) =>
  [...Array(len)].map(() =>
    (~~(Math.random() * 36)).toString(36)).join('');

module.exports = randomString;
