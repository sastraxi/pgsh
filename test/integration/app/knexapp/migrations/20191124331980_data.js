exports.up = knex => knex.raw(`
  insert into product (name, upc, image_url)
  values
    ('Widget', 'FFCD4', 'http://image1'),
    ('Bill Murray', 'A0221', 'http://image2'),
    ('Fidget Spinner', 'E1BCC', 'http://image3'),
    ('Parsnip', '62E83', 'http://image4');

`);

exports.down = knex => knex.raw(`
  truncate table product;
`);
