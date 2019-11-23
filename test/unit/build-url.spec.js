const buildUrl = require('../../src/util/build-url');

it('handles a basic case', () => {
  expect(
    buildUrl({
      user: 'postgres',
      password: 'secret',
      host: 'local.docker',
      port: 15432,
      database: 'northwind',
    }),
  ).toEqual(
    'postgres://postgres:secret@local.docker:15432/northwind',
  );
});

it('can deal with missing things', () => {
  expect(
    buildUrl({
      host: 'localhost',
      database: 'northwind',
      user: 'postgres',
    }),
  ).toEqual(
    'postgres://postgres@localhost/northwind',
  );
});

it('turns params into queries', () => {
  expect(
    buildUrl({
      host: 'localhost',
      database: 'abc',
      ssl: true,
      client_encoding: 'utf8',
    }),
  ).toEqual(
    'postgres://localhost/abc?encoding=utf8&ssl=true',
  );
});
