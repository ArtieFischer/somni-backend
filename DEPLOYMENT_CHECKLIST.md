# Dream Embedding System - Deployment Checklist

## ✅ Database Setup Complete

You've successfully run all the migration scripts. The database now has:
- `dream_embeddings` table for storing embeddings
- `dream_themes` table updated with similarity column
- `embedding_jobs` queue table
- All necessary functions and triggers

## 🚀 Next Steps for Deployment

### 1. Run Test Script
First, run `10_test_embedding_system.sql` to check:
- How many existing dreams need embeddings
- If the trigger is creating jobs automatically
- If themes have embeddings (required for theme extraction)

### 2. Deploy Backend Code

The backend code includes these new components:
- `src/services/dreamEmbedding.ts` - Core embedding logic
- `src/workers/embeddingWorker.ts` - Background job processor
- `src/routes/dreamEmbedding.ts` - API endpoints
- Updated `src/routes/transcription.ts` - Triggers embedding after transcription
- Updated `src/server.ts` - Starts the worker automatically

### 3. Environment Variables

Ensure these are set:
```bash
# Your existing variables should be sufficient
SUPABASE_URL=your-supabase-url
SUPABASE_SERVICE_ROLE_KEY=your-service-key
```

### 4. Verify Deployment

After deploying, check the worker status:
```bash
curl https://your-backend-url/api/v1/dream-embeddings/worker/status \
  -H "Authorization: Bearer YOUR_TOKEN"
```

Expected response:
```json
{
  "success": true,
  "worker": {
    "isRunning": true,
    "activeJobs": 0,
    "maxConcurrentJobs": 2
  },
  "queue": {
    "pending": 0,
    "processing": 0
  }
}
```

### 5. Monitor Initial Processing

Watch the embedding jobs:
```sql
-- See job progress
SELECT 
  ej.id,
  ej.dream_id,
  ej.status,
  ej.attempts,
  ej.error_message,
  d.title
FROM embedding_jobs ej
LEFT JOIN dreams d ON d.id = ej.dream_id
ORDER BY ej.created_at DESC
LIMIT 20;

-- Check dreams being processed
SELECT 
  id,
  title,
  embedding_status,
  embedding_processed_at,
  embedding_error
FROM dreams
WHERE embedding_status IS NOT NULL
ORDER BY updated_at DESC
LIMIT 20;
```

### 6. Test API Endpoints

Once deployed, test the endpoints:

#### Manual Processing (for testing)
```bash
# Replace DREAM_ID with an actual dream ID from your database
curl -X POST https://your-backend-url/api/v1/dream-embeddings/process \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"dreamId": "DREAM_ID"}'
```

#### Check Processing Status
```bash
curl https://your-backend-url/api/v1/dream-embeddings/status/DREAM_ID \
  -H "Authorization: Bearer YOUR_TOKEN"
```

#### Search Similar Dreams (after some dreams are processed)
```bash
curl -G https://your-backend-url/api/v1/dream-embeddings/search \
  -H "Authorization: Bearer YOUR_TOKEN" \
  --data-urlencode "query=flying in the sky" \
  --data-urlencode "limit=5"
```

### 7. Processing Existing Dreams

If you have existing dreams that need embeddings:

1. The trigger only works for NEW transcriptions
2. For existing dreams, you can either:
   - Manually trigger via the API for specific dreams
   - Run a batch job to create embedding jobs for all existing dreams:

```sql
-- Create jobs for all existing dreams that need embeddings
INSERT INTO embedding_jobs (dream_id, priority)
SELECT 
  id as dream_id,
  0 as priority
FROM dreams 
WHERE transcription_status = 'completed' 
  AND raw_transcript IS NOT NULL 
  AND length(raw_transcript) >= 50
  AND (embedding_status IS NULL OR embedding_status = 'pending')
ON CONFLICT (dream_id) DO NOTHING;
```

## 🎯 Success Indicators

You'll know the system is working when:
1. New dreams automatically get `embedding_status = 'pending'` after transcription
2. The worker processes pending jobs (status changes to 'processing' then 'completed')
3. `dream_embeddings` table starts populating with embeddings
4. `dream_themes` table gets new entries with extracted themes
5. Search API returns relevant results

## 🐛 Troubleshooting

If embeddings aren't being processed:

1. **Check worker logs** in your backend deployment
2. **Look for failed jobs**:
   ```sql
   SELECT * FROM embedding_jobs WHERE status = 'failed';
   SELECT * FROM dreams WHERE embedding_status = 'failed';
   ```
3. **Clean up stale jobs**:
   ```sql
   SELECT cleanup_stale_embedding_jobs();
   ```
4. **Verify BGE service** is initialized (check backend logs for "BGE-M3 initialized successfully")

## 📊 Monitoring

Key metrics to watch:
- Queue depth: `SELECT COUNT(*) FROM embedding_jobs WHERE status = 'pending';`
- Success rate: Compare completed vs failed in both tables
- Processing time: Check `processing_time_ms` in `dream_embeddings`
- Theme extraction: Verify themes are being found and stored