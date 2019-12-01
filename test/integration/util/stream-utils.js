const consume = async (output, lineCb, shouldExit) => {
  let iterations = 0;
  // eslint-disable-next-line no-await-in-loop
  for (let line = await output.next(); !line.done; line = await output.next()) {
    if (lineCb) lineCb(line.value);
    iterations += 1;
    if (!!shouldExit && shouldExit()) break;
  }
  return iterations;
};

/**
 * Returns false exactly n times; true thereafter.
 */
const numLines = (n) => {
  let count = 0;
  return () => {
    if (count >= n) return true;
    count += 1;
    return (count === n);
  };
};

module.exports = {
  consume,
  numLines,
};
