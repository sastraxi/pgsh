## A database branching model

As your database schema evolves, you quickly realise the challenge of keeping the structure (and triggers, stored procedures, seed data...) of the database in sync with your codebase. You may have even witnessed the horror of inconsistent db builds due to "repeatable migrations". Instead, treat the database as a code repository itself: clone and switch between branches just like you do in git.

This makes it easy to dynamically switch between tasks: juggle maintenance, feature development, and code reviews easily by keeping  separate postgres databases. pgsh does not enforce a 1:1 relationship between git and database branches, but (for your own sanity!) it's a good place to start.

### Branching

When you start a topic branch with `git checkout -b`, you should also `pgsh clone`.

### Merging

When you want to `git merge` a topic branch back into e.g. **develop**, you'll need to manually re-order migrations, as well as resolving any conflicts. Do this by performing the lion's share of the work on the topic branch:

  1. Make sure your **develop** database is up-to-date, then `pgsh clone` into a temporary database.
  2. Switch to the topic branch and `git merge|rebase develop`.
  3. Re-order your migrations after existing ones, then use `pgsh up` to attempt the migration.
  4. If the migration fails, modify the migrations and try again.
  5. Once the migrations have all been applied and the database looks correct, merge your topic branch into **develop**.

There are many other ways to accomplish this using `pgsh`. You should find the workflow that feels most natural to your team. The `force-down` and `force-up` commands can help get knex out of your way by modifying the `knex_migrations` log stored in your database.

## Recommendations

* Use integer prefixes for your migrations (e.g. `005_add_user_tokens.js`) rather than timestamps, as this makes it easier to spot and re-order.

* It's not recommended to `CREATE ROLE` in a migrations as roles are database-wide. If you do, you'll never be able to create and migrate a new database using `pgsh create -m`! On the other hand, `CREATE EXTENSION` is fine in migrations as long as your user has sufficient permissions. In practice, some extensions can only be created by the superuser.

  Instead of this, I'd suggest creating a template database and configuring `.pgshrc` to use that. If you're only developing one project on your postgres server, feel free to modify `template1` (which is the default `config.template`).

* Write your down migrations properly. When your migration replaces a function or transforms data, make sure its *down* edge faithfully re-creates the previous database to the best of its ability. Some data loss is OK (it's only development data), but structural differences restrict your ability to use `pgsh` to its fullest.

  If your migration `v` can't be down-migrated, try the following:

  1. If you're using knex to perform migrations, you can use `exports.down = (knex, Promise) => Promise.reject()`. This will force down-migrations through this edge to fail.

  2. Manually bring your database to some earlier verison `v' <= v`.

  3. Run `pgsh force-down <v'>` to re-write the migrations table to reflect your manual work.

* Add migrations to your CI database and, where possible, use (fuzzed) subsets of production data to catch migration issues early.
