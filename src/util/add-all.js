/* eslint-disable no-param-reassign */

/**
 * Like mergeOptions, but modifies an existing target.
 */
const addAll = (target, ...mergeInObjects) =>
  mergeInObjects.forEach(source =>
    Object.keys(source).forEach((key) => {
      target[key] = source[key];
    }));

module.exports = addAll;
