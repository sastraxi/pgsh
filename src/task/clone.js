const { spawn } = require('child_process');

const config = require('../config');

module.exports = db => async (current, target) => {
  const knex = db.connectAsSuper(db.fallbackUrl());
  await knex.raw(`
    create database "${target}"
    template ${config.template || 'template1'}
  `);

  const p = spawn(
    `pg_dump -Fc ${current} | pg_restore -d ${target}`,
    {
      shell: true,
      env: db.createSuperPostgresEnv(),
    },
  );

  return new Promise((resolve, reject) => {
    p.on('exit', (code, signal) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`psql failed (code ${code}, signal ${signal})`));
      }
    });
  });
};
