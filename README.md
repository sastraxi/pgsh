# pgsh
### Developer Tools for PostgreSQL

Finding database migrations painful to work with? `pgsh` can help by managing your connection string (in e.g. a `.env` file) and allowng you to branch your database, just like you branch with git.

## Setup

1. Create a `.pgshrc` in your project folder (see `.pgshrc.example` for details)
3. `yarn install pgsh --dev`

## Command Reference

`pgsh current` prints the database that your connection string refers to right now.

`pgsh url` prints your connection string

`pgsh list <filter>` prints all databases, filtered by an optional filter

`pgsh psql` connects to the current database using psql

`pgsh clone <name`
* clones your current database as `<name>`
* runs `switch <name>`

`pgsh switch <name>` makes *name* your current database
