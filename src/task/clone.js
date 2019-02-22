const c = require('ansi-colors');
const { spawn } = require('child_process');

module.exports = db => async (current, target) => {
  const { config } = db;

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

  // FIXME: capture stderr and pass to reject
  p.stderr.on('data', e =>
    process.stderr.write(c.redBright(e.toString())));

  return new Promise((resolve, reject) => {
    p.on('exit', (code, signal) => {
      if (code === 0) {
        resolve();
      } else {
        const superUser = process.env[config.vars.super_user];
        if (!superUser) {
          const { user } = db.explodeUrl(db.thisUrl());
          reject(new Error(
            'clone failed; this can happen if you do not have'
              + ` the proper permissions on your user (${user}).`
              + ' Try configuring vars.super_[user|password] in your .pgshrc'
              + ' to provide login information for commands that need it.',
          ));
        } else {
          reject(new Error(
            `psql failed (code ${code}, signal ${signal})`,
          ));
        }
      }
    });
  });
};
