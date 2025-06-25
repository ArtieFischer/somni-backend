# Dream Embeddings Implementation Documentation

## Overview
This document describes the implementation of the dream embeddings system, which processes dream transcriptions to generate semantic embeddings and extract themes.

## System Architecture

### Components
1. **Embedding Service** (`src/services/dreamEmbedding.ts`)
   - Processes dream transcriptions into semantic embeddings
   - Uses BGE-M3 model (1024-dimensional vectors)
   - Implements adaptive chunking for longer dreams
   - Extracts themes by comparing embeddings with theme vectors

2. **Background Worker** (`src/workers/embeddingWorker.ts`)
   - Polls for pending jobs every 5 seconds
   - Processes up to 2 concurrent jobs
   - Implements retry logic with exponential backoff
   - Cleans up stale jobs every 5 minutes

3. **API Endpoints** (`src/routes/dreamEmbedding.ts`)
   - `/api/v1/dream-embeddings/process` - Manual trigger
   - `/api/v1/dream-embeddings/search` - Similarity search
   - `/api/v1/dream-embeddings/themes/:dreamId` - Get themes
   - `/api/v1/dream-embeddings/status/:dreamId` - Check status

4. **Database Schema**
   - `dreams` - Added embedding status columns
   - `dream_embeddings` - Stores embedding vectors
   - `dream_themes` - Links dreams to themes
   - `embedding_jobs` - Job queue for async processing
   - `themes` - Pre-computed theme embeddings

## Implementation Details

### Text Chunking Strategy
- **Short dreams** (< 1000 tokens): Single chunk
- **Long dreams** (> 1000 tokens): Multiple overlapping chunks
  - Chunk size: 750 tokens
  - Overlap: 100 tokens
  - Preserves paragraph boundaries

### Embedding Generation Flow
1. Transcription completes → triggers embedding job
2. Worker picks up job → acquires processing lock
3. Validates dream has transcript
4. Creates adaptive chunks
5. Generates embeddings for each chunk
6. Stores embeddings in database
7. Extracts themes (similarity > 0.6)
8. Updates dream status

### Key Configuration
```typescript
MIN_TOKENS_FOR_EMBEDDING = 10  // ~40 characters
MAX_TOKENS_PER_CHUNK = 1000   // BGE-M3 limit
CHUNK_SIZE_TOKENS = 750       // Target chunk size
OVERLAP_TOKENS = 100          // Chunk overlap
THEME_SIMILARITY_THRESHOLD = 0.6
MAX_THEMES_PER_DREAM = 5
```

## Problems Encountered and Solutions

### 1. Permission Denied Errors
**Problem**: "permission denied for table embedding_jobs"
**Cause**: RLS was enabled on internal job queue table
**Solution**: 
```sql
ALTER TABLE embedding_jobs DISABLE ROW LEVEL SECURITY;
```

### 2. Sequence Permission Errors
**Problem**: "permission denied for sequence dream_embeddings_id_seq"
**Solution**: Grant sequence permissions
```sql
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO service_role;
```

### 3. Check Constraint Violations
**Problem**: "violates check constraint dreams_embedding_attempts_check"
**Cause**: Attempts exceeded 3 (constraint limit)
**Solution**: Reset attempts before retrying
```sql
UPDATE dreams SET embedding_attempts = 2 WHERE embedding_attempts >= 3;
```

### 4. Service Role Access Issues
**Problem**: Service role couldn't bypass RLS
**Solution**: Created `getServiceClient()` method with proper auth headers
```typescript
getServiceClient(): SupabaseClient {
  return createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false
    },
    global: {
      headers: {
        Authorization: `Bearer ${serviceRoleKey}`
      }
    }
  });
}
```

### 5. Jobs Not Being Picked Up
**Problem**: Worker reported "No pending jobs found"
**Cause**: Mismatch between job status and dream status
**Solution**: Synchronized statuses between tables

## SQL Scripts Created
1. `01_dream_embeddings_tables.sql` - Core tables
2. `02_embedding_jobs_queue.sql` - Job queue system
3. `03_embedding_functions.sql` - Helper functions
4. `04_update_dream_themes_table.sql` - Added similarity column
5. `05_theme_extraction_function.sql` - Theme matching logic
6. `06_rls_policies.sql` - Security policies
7. `12_fix_embedding_jobs_rls.sql` - Disable RLS on jobs
8. `16_fix_sequence_permissions.sql` - Grant sequence access
9. Various diagnostic and fix scripts (13-24)

## Testing and Validation

### Current Status
- ✅ Worker successfully processes dreams
- ✅ Embeddings generated and stored
- ✅ Jobs complete without errors
- ⚠️ Theme extraction returns 0 themes (threshold may be too high)

### Test Results
```
Dreams processed: 5
Chunks per dream: 1 (short dreams)
Processing time: 5-7 seconds per dream
Success rate: 100%
```

## Future Improvements

1. **Theme Matching**
   - Adjust similarity threshold (currently 0.6)
   - Add more relevant themes
   - Consider different embedding models

2. **Performance**
   - Batch embedding generation
   - Increase concurrent job limit
   - Cache theme embeddings

3. **Features**
   - Cross-dream similarity search
   - Theme trends over time
   - Personalized theme suggestions

## Frontend Integration

### Retrieving Dream Themes
```typescript
// API endpoint
GET /api/v1/dream-embeddings/themes/:dreamId

// React hook example
const { themes, loading, error } = useDreamThemes(dreamId);
```

### Required Environment Variables
```
NEXT_PUBLIC_BACKEND_URL=https://somni-backend-production.up.railway.app
NEXT_PUBLIC_API_SECRET=your-api-secret
```

## Monitoring and Maintenance

### Health Checks
- Worker status: `/api/v1/dream-embeddings/worker/status`
- Debug jobs: `/api/v1/debug-embedding-jobs/check-jobs`

### Common Operations
```sql
-- Check job status
SELECT status, COUNT(*) FROM embedding_jobs GROUP BY status;

-- Reset failed jobs
UPDATE embedding_jobs SET status = 'pending', attempts = 0 
WHERE status = 'failed';

-- Check embedding completion rate
SELECT embedding_status, COUNT(*) FROM dreams 
GROUP BY embedding_status;
```

## Cost Considerations
- Worker polls every 5 seconds (minimal cost)
- Only processes when jobs exist
- Embedding generation happens once per dream
- No continuous processing = low operational cost