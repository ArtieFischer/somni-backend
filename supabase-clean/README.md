# Supabase Clean Directory

This directory contains a clean, consolidated version of the Somni database schema, rebuilt from the current production state.

## Quick Start

1. **Review the schema**:
   ```bash
   # View the complete initial schema
   cat migrations/00000000000001_initial_schema.sql
   
   # View seed data (themes)
   cat migrations/00000000000002_seed_data.sql
   ```

2. **Apply to a fresh database**:
   ```bash
   # Reset database (WARNING: Deletes all data!)
   ./scripts/reset-database.sh
   
   # Apply migrations
   supabase db push
   
   # Generate TypeScript types
   ./scripts/generate-types.sh
   ```

3. **Review documentation**:
   - [Schema Overview](docs/schema-overview.md)
   - [Table Documentation](docs/tables/)
   - [TypeScript Types](types/database.types.ts)

## What's Included

✅ **Complete Schema** - All tables, indexes, functions, triggers, and RLS policies in one file
✅ **TypeScript Types** - Full type safety for all database operations  
✅ **Comprehensive Docs** - Detailed documentation for every table and relationship
✅ **Seed Data** - All dream themes with descriptions
✅ **Helper Scripts** - Database reset and type generation utilities

## Key Improvements

- **Single source of truth** - No more scattered migrations
- **Clear documentation** - Every table and field documented
- **Type safety** - Complete TypeScript definitions
- **Clean structure** - Logical organization of all components
- **Best practices** - Consistent naming, proper constraints, optimized indexes

## Next Steps

1. **Migrate existing data** - Scripts for data migration from current schema (TBD)
2. **Generate embeddings** - Run embedding service to populate theme vectors
3. **Validate integrity** - Ensure all relationships and constraints are satisfied
4. **Performance testing** - Verify query performance with production data