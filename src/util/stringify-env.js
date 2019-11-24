/**
 * Turn key-value pairs into the dotenv file format.
 */
module.exports = keyValuePairs =>
  Object.keys(keyValuePairs)
    .map((key) => {
      const value = keyValuePairs[key];
      return `${key}=${value}`;
    })
    .join('\n');
