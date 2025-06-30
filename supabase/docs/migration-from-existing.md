# Migration Guide from Existing Database

## Overview

This guide helps you migrate from the current production database to the clean schema.

## Important Compatibility Notes

### 1. Transcription Status Enum
The `transcription_status_enum` includes both old and new values for compatibility:
- **Old values**: `'done'`, `'error'` (kept for backward compatibility)
- **New values**: `'completed'`, `'failed'` (use these going forward)

The migration will automatically update existing records from old to new values.

### 2. RLS Policy Changes
All service role policies have been renamed for clarity:
- `"Service role has full access"` → `"Service role can manage [table_name]"`

This prevents confusion when debugging RLS issues across multiple tables.

### 3. Embedding Jobs Table
The `embedding_jobs` table intentionally does NOT have RLS enabled. This is required for backend workers to process jobs regardless of user context.

## Migration Steps

### Step 1: Backup Current Database
```bash
pg_dump your_database_url > backup_$(date +%Y%m%d_%H%M%S).sql
```

### Step 2: Create Test Database
1. Create a new Supabase project for testing
2. Apply the clean schema:
   ```bash
   psql your_test_database_url < migrations/00000000000001_initial_schema.sql
   psql your_test_database_url < migrations/00000000000002_seed_data.sql
   ```

### Step 3: Migrate Data
Run these queries to migrate data from production to test:

```sql
-- 1. Migrate users (handled by Supabase auth)

-- 2. Migrate profiles
INSERT INTO profiles 
SELECT * FROM production.profiles;

-- 3. Migrate dreams (update transcription_status)
INSERT INTO dreams 
SELECT 
  id, user_id, created_at, updated_at, title, raw_transcript,
  image_prompt, is_lucid, mood, clarity, location_metadata,
  CASE 
    WHEN transcription_status = 'done' THEN 'completed'::transcription_status_enum
    WHEN transcription_status = 'error' THEN 'failed'::transcription_status_enum
    ELSE transcription_status
  END as transcription_status,
  transcription_metadata, transcription_job_id,
  embedding_status, embedding_error, embedding_attempts,
  embedding_processed_at, embedding_started_at
FROM production.dreams;

-- 4. Continue with other tables...
```

### Step 4: Verify Data Integrity
```sql
-- Check record counts
SELECT 'profiles' as table_name, COUNT(*) FROM profiles
UNION ALL
SELECT 'dreams', COUNT(*) FROM dreams
UNION ALL
SELECT 'interpretations', COUNT(*) FROM interpretations;

-- Verify RLS policies
SELECT schemaname, tablename, policyname 
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
```

### Step 5: Test Application
1. Update your application to use the test database URL
2. Test all major features:
   - User authentication and profile creation
   - Dream creation and transcription
   - Interpretation generation
   - Conversation features
   - File uploads

### Step 6: Production Migration
Once testing is complete:
1. Schedule a maintenance window
2. Backup production database
3. Apply clean schema to production
4. Migrate data
5. Update application configuration
6. Monitor for issues

## Rollback Plan

If issues occur:
1. Restore from backup:
   ```bash
   psql your_database_url < backup_[timestamp].sql
   ```
2. Revert application configuration
3. Investigate and fix issues before retry

## Common Issues and Solutions

### Issue: RLS policies blocking access
**Solution**: Check that all policies are correctly defined and that service role policies exist for backend operations.

### Issue: Enum value conflicts
**Solution**: The schema includes both old and new enum values. Ensure your application code uses the new values ('completed', 'failed').

### Issue: Missing embeddings
**Solution**: After migration, run the embedding generation job to populate any missing embeddings.

### Issue: Storage bucket access
**Solution**: Verify storage bucket policies are correctly applied. The schema includes all necessary bucket configurations.

## Post-Migration Tasks

1. **Generate embeddings for themes**:
   ```bash
   # Run your embedding generation script
   npm run generate-theme-embeddings
   ```

2. **Update application code**:
   - Use new enum values ('completed' instead of 'done')
   - Update any hard-coded policy names if referenced

3. **Monitor performance**:
   - Check query performance
   - Monitor RLS policy evaluation time
   - Verify vector search performance

4. **Clean up**:
   - Remove test database once migration is successful
   - Archive backup files after verification period