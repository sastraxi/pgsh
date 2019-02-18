# pgsh
### Developer Tools for PostgreSQL
Finding database migrations painful to work with? Switching contexts a chore? Manual backups getting you down? pgsh can help by managing your connection string (in e.g. a `.env` file) and allowing you to branch your database, just like you branch with git.

## Setup
1. Create a `.pgshrc` config file in your project folder (see `.pgshrc.example` for details)
2. `sudo yarn global add pgsh` to make the `pgsh` command available everywhere
3. `sudo yarn global add knex-migrate` (if using knex features; see below)

There are two different ways pgsh can help you manage your current connection (`mode` in `.pgshrc`):
* `url` (default) looks for `vars.url` in the config file, which you should set to the key in your `.env` that has your full database connection string (i.e. `postgres://...`)
* `split` when your `.env` has different keys (e.g. `PG_HOST`, `PG_DATABASE`, ...)

## Connection String Management Commands
* `pgsh url` prints your connection string.
* `pgsh psql <name?>` connects to the current (or *name*d) database with psql

### Database Branching
As your database schema evolves, you quickly realise the challenge of keeping the structure (and triggers, stored procedures, seed data...) of the database in sync with your codebase. You may have even witnessed the horror of inconsistent db builds due to "repeatable migrations". Instead, treat the database as a code repository itself: clone and switch between branches just like you do in git.

This makes it easy to dynamically switch between tasks: juggle maintenance, feature development, and code reviews easily by keeping  separate postgres databases. pgsh does not enforce a 1:1 relationship between git and database branches, but (for your own sanity!) it's a good place to start.

* `pgsh current` prints the name of the database that your connection string refers to right now.
* `pgsh` or `pgsh list <filter?>` prints all databases, filtered by an optional filter. Output is similar to `git branch`.
* `pgsh clone <name>` clones your current database as *name*, then runs `switch <name>`.
* `pgsh switch <name>` makes *name* your current database, changing the connection string.
* `pgsh destroy <name>` destroys the given database. *This cannot be undone.* You can maintain a blacklist of databases to protect from this command in `.pgshrc`

As of right now, there are no plans for automated merge functionality.

## Dump and Restore Commands
* `pgsh dump <name?>` dumps either the current database, or the *name*d one (if given) to stdout
* `pgsh restore <name>` restores a previously-dumped database as *name* from stdin

## Migration Commands (via Knex)
pgsh provides a slightly-more-user-friendly interface to knex's [migration system](https://knexjs.org/#Migrations).

* `pgsh up` migrates the current database to the latest version found in your migration directory.
* `pgsh down <version>` down-migrates the current database to *version*. This shells out to the [knex-migrate](https://github.com/sheerun/knex-migrate) tool, and as such requires that it be available in your `PATH`.

### Migration Recovery Commands
Suppose you made some schema changes manually (hey, pobody's nerfect) in order to solve a problem / save some data. Perhaps you are merging two branches that have incompatible migrations. In case your database schema and the knex migration log get out of sync, try the following commands to fix your problem.

* `knex force-down <version>` re-writes the `knex_migrations` table to not include the record of any migration past the given *version*. Use this command when you manually un-migrated some migations (e.g. a bad migration or when you are trying to undo a migration with missing "down sql").

* `knex force-up` re-writes the `knex_migrations` table *entirely* based on your migration directory. In effect, running this command is saying to knex "trust me, the database has the structure you expect".
