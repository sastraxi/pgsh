# pgsh
### Developer Tools for PostgreSQL

Finding database migrations painful to work with? pgsh can help by managing your connection string (in e.g. a `.env` file) and allowng you to branch your database, just like you branch with git.

## Setup

1. Create a `.pgshrc` in your project folder (see `.pgshrc.example` for details)
3. `yarn install pgsh --dev`

## Command Reference

`pgsh current` prints the database that your connection string refers to right now.

`pgsh url` prints your connection string

`pgsh list <filter>` prints all databases, filtered by an optional filter

`pgsh psql` connects to the current database using psql

`pgsh clone <name>` clones your current database as *name*, then runs `switch <name>`

`pgsh switch <name>` makes *name* your current database

`pgsh down <version>` down-migrates the current database to *version*, while
`pgsh up` migrates the current database to the latest version found in your migration directory.

`pgsh destroy <name>` destroys the given database. *This cannot be undone.*
You can maintain a blacklist of databases to protect from this command in `.pgshrc`

## Migration Commands (via Knex)

pgsh works with knex to 

`pgshdu

### Migration Recovery Commands

Suppose you made some schema changes manually (hey, pobody's nerfect) in order to solve a problem / save some data.
In case your database schema and the knex migration log get out of sync, try the following commands to fix your problem.

`knex force-down <version>` re-writes the `knex_migrations` table to not include the record of any migration past the given *version*. Use this command when you manually un-migrated some migations (e.g. a bad migration or a missing up migration).

`knex resolve-conflicts` re-writes the `knex_migrations` table *entirely* based on your migration directory. In effect, running this command is saying to knex "trust me, the database has the structure you expect".
