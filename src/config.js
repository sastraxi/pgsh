const config = require('./pgshrc/read');

module.exports = {
  ...config,
  // FIXME: metrics are currently broken and could cause the app to hang.
  force_disable_metrics: true,
};
