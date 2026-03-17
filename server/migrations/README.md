# Database Migrations

This folder contains SQL migration scripts for the Safedify PostgreSQL database.

## Running Migrations

Apply migrations in order using `psql`:

```bash
# Connect to the database
psql -h localhost -U safedify_user -d safedify

# Or run a specific migration file
psql -h localhost -U safedify_user -d safedify -f 001_add_fts_indexes.sql
```

## Migration Files

| File | Description |
|------|-------------|
| `001_add_fts_indexes.sql` | Adds GIN indexes for PostgreSQL full-text search |

## Notes

- Migrations are idempotent — they can be run multiple times safely
- Always backup your database before running migrations in production
- The main schema is in `postgres-schema.sql` (run first for new databases)
