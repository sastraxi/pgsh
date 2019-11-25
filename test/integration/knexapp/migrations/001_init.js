exports.up = knex => knex.raw(`
  create table product (
    id serial primary key,
    upc char(20) not null,
    name text not null
  );
`);

exports.down = knex => knex.raw(`
  drop table product;
`);
