const findConfig = require('find-config');

module.exports = !!findConfig('.pgshrc');
