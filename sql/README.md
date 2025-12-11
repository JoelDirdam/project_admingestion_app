# SQL Scripts

This folder contains SQL scripts for database initialization, migrations, and maintenance.

## Structure

- `init/` - Initial database setup scripts
- `migrations/` - Manual migration scripts (if needed)
- `seeds/` - Seed data scripts
- `backups/` - Backup scripts

## Usage

Run scripts using psql or your preferred PostgreSQL client:

```bash
psql -U username -d panaderia_la_paz -f init/01_create_database.sql
```


