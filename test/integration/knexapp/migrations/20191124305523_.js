exports.up = knex => knex.raw(`
  alter table product add column image_url text default null;
`);

exports.down = knex => knex.raw(`
  alter table product drop column image_url;
`);
