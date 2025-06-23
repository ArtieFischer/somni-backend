# 384-Dimensional Theme Embeddings Cleanup Guide

This document lists all files and references to the old 384-dimensional theme embeddings that need to be cleaned up or migrated to the new BGE-M3 (1024D) system.

## Database Schema References

### 1. Migration Files
- **`supabase/migrations/000_initial_schema.sql`**
  - Line 111: `embedding vector(384),` in themes table
  - Line 148: `embedding vector(384),` in dream_symbols table
  - Line 194: `embedding vector(384),` in conversations table
  - Line 209: `embedding vector(384),` in knowledge_base table
  - Line 316: `query_embedding vector(384),` in search functions
  - Line 342: `query_embedding vector(384),` in search functions

- **`supabase/migrations/004_create_update_theme_embedding_function.sql`**
  - Line 6: `theme_embedding vector(384)` - Function parameter for updating theme embeddings
  - This entire function is for 384D embeddings and should be removed/updated

- **`supabase/migrations/20240101000002_clean_and_prepare_bge.sql`**
  - Line 35: `DROP FUNCTION IF EXISTS search_themes(vector(384), float, int);`
  - This migration already handles the transition from 384D to 1024D

### 2. SQL Scripts
- **`check-theme-embeddings.sql`** - Checks for old embedding column (still references 384D structure)
- **`test-dream-theme-access.sql`** - May contain references to old embedding functions
- **`verify-embeddings.sql`** - Verification script for old embeddings

## Application Code References

### 1. Test Files
- **`test-local-embeddings.ts`** 
  - Tests the old 384D embedding system
  - Uses the old `embedding` column without BGE suffix
  - Should be updated or removed

- **`supabase/scripts/test-theme-similarity.ts`**
  - Tests theme similarity with old 384D embeddings
  - References old embedding column structure

### 2. Edge Functions
- **`supabase/functions/embed-themes/index.ts`**
  - Uses MiniLM model for 384D embeddings
  - Line 21-24: Loads "Xenova/all-MiniLM-L6-v2" model
  - Line 73: Updates `embedding` column with 384D vectors
  - This entire function should be removed or updated for BGE-M3

- **`supabase/functions/embed-dream/index.ts`**
  - May contain references to 384D theme embeddings for dream analysis

### 3. Service Files
- **`src/services/embeddings.service.ts`**
  - Line 50+: Uses MiniLM model for 384D embeddings
  - This service is still in use and needs to be evaluated

- **`src/services/rag.service.ts`**
  - Uses embeddings service which generates 384D vectors
  - May need updates to use BGE service for theme-related operations

- **`src/services/hybrid-rag.service.ts`**
  - May use theme embeddings in hybrid search
  - Needs review for 384D references

### 4. Scripts
- **`supabase/scripts/seed-themes.ts`**
  - Seeds themes but relies on old embedding system
  - Should be updated to use BGE-M3

- **`supabase/scripts/seed-themes-admin.ts`**
  - Admin version of theme seeding
  - Also relies on old embedding system

### 5. Routes
- **`src/routes/embeddings.ts`**
  - May contain endpoints for generating 384D embeddings
  - Should be reviewed and updated

- **`src/routes/embeddings-simple.ts`**
  - Simplified embedding routes
  - May need updates

## Database Types
- **`supabase/types/database.types.ts`**
  - Contains TypeScript types for database schema
  - Will have references to `vector(384)` types
  - Needs regeneration after migration

## Documentation Files
- **`supabase/docs/complete-database-architecture.md`**
  - Contains documentation about 384D embeddings
  - Should be updated to reflect new architecture

- **`supabase/docs/migration-guide.md`**
  - May reference old embedding system
  - Should be updated

- **`supabase/CHANGES.md`**
  - Should document the migration from 384D to 1024D

## Cleanup Steps

1. **Database Migration**
   - Run migration `20240101000002_clean_and_prepare_bge.sql` (already created)
   - This drops the old 384D column and creates new 1024D column

2. **Remove/Update Edge Functions**
   - Delete or update `supabase/functions/embed-themes/index.ts`
   - Review `supabase/functions/embed-dream/index.ts`

3. **Update Application Code**
   - Update all services to use BGE-M3 embeddings for themes
   - Remove test files for 384D embeddings
   - Update seeding scripts

4. **Regenerate Types**
   - Run `supabase gen types typescript` after migration
   - Update all TypeScript interfaces

5. **Update Documentation**
   - Update all documentation files to reflect new system
   - Add migration notes to CHANGES.md

## New BGE-M3 System Files (For Reference)
- `src/services/embeddings-bge.service.ts` - New BGE service
- `src/scripts/rag/generate-theme-bge-embeddings.ts` - Script to generate BGE embeddings
- `supabase/migrations/20240101000003_add_bge_embeddings_to_themes.sql` - BGE column addition
- Various BGE-related scripts in `src/scripts/rag/`

## Notes
- The migration from 384D to 1024D is already partially implemented
- Some files may serve dual purposes and need careful review
- Test files should be updated to test the new system
- Consider keeping a backup of the old system for rollback purposes