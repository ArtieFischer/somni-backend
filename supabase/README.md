# Supabase Directory Structure

This directory contains all Supabase-related files for the Somni backend.

## Directory Structure

```
supabase/
├── migrations/          # Database migrations
├── functions/          # Supabase Edge Functions  
├── types/             # TypeScript types
├── docs/              # Documentation
└── debug/             # Debug scripts and queries
```

## Fresh Start Setup

### 1. Reset Database (if needed)
```sql
-- Run in Supabase SQL editor to drop all existing tables
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO public;
```

### 2. Run Initial Migration
```bash
# Using Supabase CLI
supabase db reset
supabase migration up

# Or in SQL editor
# Run the contents of migrations/000_initial_schema.sql
```

### 3. Verify Setup
```sql
-- Check tables were created
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public';

-- Should see: profiles, dreams, interpreters, transcription_usage
```

### 4. Apply Additional Migrations
```bash
# Run any additional migrations in order
# For example, to fix auth signup issues:
supabase migration up 005_fix_auth_signup_trigger

# Or manually in SQL editor run the contents of:
# migrations/005_fix_auth_signup_trigger.sql
```

## Known Issues and Fixes

### Authentication Signup Issue
If users encounter errors when creating accounts, the issue is likely related to the auth trigger not having proper permissions. This is fixed in migration `005_fix_auth_signup_trigger.sql` which:

1. Adds `SECURITY DEFINER` to the `handle_new_user()` function so it can bypass RLS
2. Implements better error handling to prevent signup failures
3. Ensures unique handle generation with collision detection
4. Adds explicit service role permissions for profile insertion
5. Properly configures all necessary grants

To apply this fix:
```sql
-- Run the migration file migrations/005_fix_auth_signup_trigger.sql
-- This will recreate the trigger with proper permissions
```

## Database Schema

### Core Tables
- **profiles** - User profiles with settings and preferences
- **dreams** - Dream entries with transcriptions and embeddings
- **interpreters** - Dream interpreter profiles (Carl, Sigmund, Lakshmi, Mary)
- **transcription_usage** - Track API usage for billing

### Storage Buckets
- **avatars** - User profile pictures
- **interpreters** - Interpreter images
- **dream-images** - Images generated from dreams

## Types

TypeScript types are manually maintained in `types/`:
- `profiles.types.ts` - Profile-related types

To generate types from your database:
```bash
supabase gen types typescript --project-id your-project-id > types/database.generated.ts
```

## Edge Functions

- `dreams-transcribe-init/` - Handles dream transcription initialization
- `embed-dream/` - Generates MiniLM embeddings for dreams and extracts themes
- `embed-themes/` - Batch generates embeddings for theme definitions

## Documentation

- `database-restructure.md` - Initial restructuring documentation
- `complete-database-architecture.md` - Comprehensive database architecture with all tables

## Legacy Files to Remove

The following SQL files in `src/scripts/sql/` are now obsolete and can be removed:
- `01-knowledge-base-schema.sql` - Incorporated into main schema
- `02-add-dream-title.sql` - Already in main schema
- `03-add-dream-images.sql` - Replaced by dream_images table
- `02-enhanced-search-knowledge.sql` - Function included in main schema

These were incremental patches that are no longer needed with the fresh database approach.