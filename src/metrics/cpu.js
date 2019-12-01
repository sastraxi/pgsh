/* eslint-disable key-spacing */
const os = require('os');

const averageOf = (cpus) => {
  const avg = (key, key2) =>
    cpus.map(x => (!key2 ? x[key] : x[key][key2]))
      .reduce((a, b) => (a + b), 0) / cpus.length;

  if (cpus.length === 0) return undefined;
  return {
    model: cpus[0].model,
    cores: cpus.length,
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
  type: os.type(),
  platform: os.platform(),
  release: os.release(),
});

module.exports = getCpuMetrics;
