## Pull Request Review and Merging

In the below scenario, we will keep a consistent naming scheme: branches will have any type (e.g. `feat/`) removed, then the whole thing will be converted to `snake_case` and prefixed with `app_`.

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

    * in the future, pgsh will facilitate this more directly.

14. If there are problems, we should fix them in *our* migration(s).

15. Once you've manually migrated the database to the latest version, run `pgsh force-up` to re-write the `knex_migrations` table and complete your process.
