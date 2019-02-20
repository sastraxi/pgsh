/**
 * Builds a mapping from values of keyMap to values of valueMap
 * for entries with the same key.
 * Only keys in keyMap will be considered.
 *
 * @param {object} keyMap
 * @param {object} valueMap
 */
const buildMap = (keyMap, valueMap) => {
  const output = {};
  Object.keys(keyMap).forEach((key) => {
    output[keyMap[key]] = valueMap[key];
  });
  return output;
};

module.exports = buildMap;
