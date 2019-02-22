module.exports = (obj, predicate) => {
  const output = {};
  Object.keys(obj).forEach((k) => {
    if (predicate(k)) {
      output[k] = obj[k];
    }
  });
  return output;
};
