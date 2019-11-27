/* eslint-disable key-spacing */
const os = require('os');

const averageOf = (cpus) => {
  const avg = (key, key2) =>
    cpus.map(x => !(key2 ? x[key] : x[key][key2]))
      .reduce((a, b) => (a + b));

  if (cpus.length === 0) return undefined;
  return {
    model: `${cpus.length}x ${cpus[0]}`,
    speed: avg('speed'),
    times: {
      user: avg('times', 'user'),
      nice: avg('times', 'nice'),
      sys:  avg('times', 'sys'),
      idle: avg('times', 'idle'),
      irq:  avg('times', 'irq'),
    },
  };
};

const getCpuMetrics = () => ({
  cpus: averageOf(os.cpus()),
  loadavg: os.loadavg(),
});

module.exports = getCpuMetrics;
