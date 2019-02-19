# pgsh
### PostgreSQL tools for local development
Finding database migrations painful to work with? Switching contexts a chore? Manual backups getting you down? pgsh can help by managing  connection string in your `.env` file and allows you to easily clone your database, just like you branch with git.

## Pre-requisites
* a `.env` file for your project (see [dotenv](https://www.npmjs.com/package/dotenv))
* database configuration key/value pair(s) in your `.env`

## Setup
1. Create a `.pgshrc` config file in your project folder, beside your `.env` file (see `.pgshrc.example` for details)
2. `sudo yarn global add pgsh` to make the `pgsh` command available everywhere
3. `sudo yarn global add knex-migrate` (if using knex features; see below)
4. You can now run `pgsh` anywhere in your project directory (try `pgsh -a`!)

## URL vs Split Mode
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
* `pgsh` or `pgsh list <filter?>` prints all databases, filtered by an optional filter. Output is similar to `git branch`. By adding the `-a` option you can see migration status too!
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

* `pgsh force-up` re-writes the `knex_migrations` table *entirely* based on your migration directory. In effect, running this command is saying to knex "trust me, the database has the structure you expect".

* `pgsh force-down <version>` re-writes the `knex_migrations` table to not include the record of any migration past the given *version*. Use this command when you manually un-migrated some migations (e.g. a bad migration or when you are trying to undo a migration with missing "down sql").

## Example Scenario
In the below scenario, we will keep a consistent naming scheme: branches will have any type (e.g. `feat/`) removed, then the whole thing will be converted to `snake_case` and prefixed with `app_`.

### Pull Request Review and Merging

1. Imagine you're working on a new feature branch `feat/shiny-new`, and that feature includes some new database migrations.

2. While you're working, your co-worker has an urgent request: she needs her `fix/urgent` branch reviewed ASAP!

3. Because you're already using `pgsh`, your feature database `app_shiny_new` is separate from your `develop` branch database `app_develop`. Switch back to it using `pgsh switch app_develop`, as it is a common ancestor for your and your co-worker's development history.

4. Let's `git pull` then `git checkout fix/urgent`.

5. Turns out that as part of the fix for the bug, your co-worker needed to retroactively fix some entries in the database, resulting in a new migration, `050_fix_timestamps.js`. Let's clone our database so we can try out the migration without clobbering our data: `pgsh clone app_urgent`.

6. `pgsh up` will migrate the newly-created database up to version 50.

7. You can now explore the applied database and run the branch's code against it, verifying both the code fix and that the migration also works with your local data.

8. Let's say you approve the pull request and merge into `develop`. While the ops team is busy deploying the fix, we can move our migrations around so that come PR time things aren't so difficult.

9. Pull the `develop` branch changes by `git checkout develop && git pull`.

10. Switch back to our branch by `git checkout feat/shiny_new && pgsh switch app_shiny_new`.

11. Let's bring our co-worker's changes and migrations into our branch: `git merge develop` or `git rebase develop`, depending on your workflow.

12. Because migrations are ordered, we now have two `050_` migrations. Our co-worker's code has been committed to `develop`, so we need to re-order our migrations after by increasing their sequence number(s).

13. Now we have a valid migrations directory, but our knex migration log doesn't know about our co-worker's migration (and it hasn't been applied to our database). Let's fix the latter first by *manually running the migration code* by pasting it into `pgsh psql`, preferably inside of a transaction so we can rollback if we get into trouble.

14. If there are problems, we should fix them in *our* migration(s).

15. Once you've manually migrated the database to the latest version, run `pgsh force-up` to re-write the `knex_migrations` table and complete your process.
