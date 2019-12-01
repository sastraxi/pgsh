/**
 * Escapes all regex special characters from s; the returned
 * value can then be used as a literal in a regular expression
 */
const escapeRegex = s =>
  s.replace(/[-\\^$*+?.()|[\]{}]/g, '\\$&');

module.exports = {

  startsWith: s =>
    new RegExp(`^${escapeRegex(s)}`),

};
