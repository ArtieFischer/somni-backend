# Dream Embedding Implementation Guide

## Overview
Run these SQL scripts in order to set up the dream embedding system. The scripts are designed to work with your existing `dream_themes` table structure.

## Scripts to Run (in order)

### 1. **01_dream_embeddings_tables.sql**
Creates the main `dream_embeddings` table for storing BGE-M3 embeddings.

### 2. **02_dreams_embedding_columns.sql**
Adds embedding tracking columns to the `dreams` table.

### 3. **03_embedding_jobs_table.sql**
Creates the job queue table for async processing.

### 4. **04_update_dream_themes_table.sql**
Updates your existing `dream_themes` table to add the `similarity` column and other required fields.

### 5. **05_search_functions.sql**
Creates functions for searching similar dreams and retrieving themes.

### 6. **06_rls_policies.sql**
Sets up Row Level Security policies.

### 7. **07_embedding_trigger.sql**
Creates trigger to automatically queue embeddings after transcription.

### 8. **08_add_comments.sql**
Adds documentation comments to tables and columns.

### 9. **09_verify_setup.sql**
Verification script to ensure everything was created correctly.

## How to Run

1. Open Supabase SQL Editor
2. Run each script in order (01 through 08)
3. Run script 09 to verify - all checks should show matching found/expected counts

## After Running Scripts

1. **Deploy the backend code** with the new embedding services
2. **Verify worker is running**: 
   ```bash
   curl https://your-backend-url/api/v1/dream-embeddings/worker/status
   ```
3. **Monitor embedding jobs**:
   ```sql
   SELECT * FROM embedding_jobs ORDER BY created_at DESC LIMIT 10;
   ```

## Notes

- The system is designed to work with your existing `dream_themes` table
- The `similarity` column will be added alongside your existing `score` column
- The `get_dream_themes` function uses `COALESCE(similarity, score)` to work with both old and new data
- All new dreams will automatically get embeddings generated after transcription