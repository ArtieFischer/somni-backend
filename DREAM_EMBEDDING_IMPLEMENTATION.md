# Dream Embedding Implementation Summary

## What Was Implemented

### 1. Database Schema (`supabase/migrations/20250125_dream_embeddings_system.sql`)
- **dream_embeddings** table: Stores 1024D BGE-M3 embeddings with chunking support
- **dream_themes** table: Maps dreams to extracted themes via similarity
- **embedding_jobs** table: Async job queue with retry logic
- **Dreams table updates**: Added embedding_status, embedding_error, embedding_attempts fields
- **RLS policies**: Secure access control for user data
- **Database functions**: search_similar_dreams, get_dream_themes, cleanup_stale_embedding_jobs

### 2. Core Services
- **DreamEmbeddingService** (`src/services/dreamEmbedding.ts`)
  - Adaptive chunking (single chunk < 1000 tokens, overlap for longer)
  - BGE-M3 embedding generation
  - Theme extraction via cosine similarity
  - Robust error handling and retry logic
  
- **EmbeddingWorker** (`src/workers/embeddingWorker.ts`)
  - Background job processor (checks every 5 seconds)
  - Max 2 concurrent jobs
  - Automatic cleanup of stale jobs
  - Graceful shutdown support

### 3. API Endpoints (`src/routes/dreamEmbedding.ts`)
- `POST /api/v1/dream-embeddings/process` - Manual embedding trigger
- `GET /api/v1/dream-embeddings/search` - Semantic search
- `GET /api/v1/dream-embeddings/themes/:dreamId` - Get extracted themes
- `GET /api/v1/dream-embeddings/status/:dreamId` - Check processing status
- `GET /api/v1/dream-embeddings/worker/status` - Worker health

### 4. Integration Points
- **Transcription Route**: Auto-triggers embedding after successful transcription
- **Server**: Starts embedding worker on startup, handles graceful shutdown
- **BGE Service**: Reuses existing BGE-M3 implementation (1024D embeddings)

## Key Features

### Async & Non-blocking
- Embedding generation doesn't slow down transcription
- Jobs queued and processed in background
- Failed jobs retry with exponential backoff

### Smart Chunking
- Short dreams (< 1000 tokens): Single embedding
- Long dreams: 750-token chunks with 100-token overlap
- Preserves paragraph boundaries when possible

### Theme Extraction
- Compares against pre-computed theme embeddings
- Configurable similarity threshold (default 0.6)
- Max 5 themes per dream

### Error Handling
- Processing lock prevents race conditions
- Max 3 retry attempts
- Stale job cleanup after 30 minutes
- Non-English dreams marked as "skipped"

## Quick Start

### 1. Run Database Migration
```bash
cd /Users/gole/Desktop/somni/somni-backend/somni-backend
supabase migration up
```

### 2. Start Backend
```bash
npm run dev
# Worker starts automatically and begins processing jobs
```

### 3. Monitor Worker
```bash
curl http://localhost:3000/api/v1/dream-embeddings/worker/status \
  -H "Authorization: Bearer $TOKEN"
```

### 4. Test Manual Processing
```bash
curl -X POST http://localhost:3000/api/v1/dream-embeddings/process \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"dreamId": "your-dream-id"}'
```

## Architecture Benefits

1. **No Performance Impact**: Transcription returns immediately
2. **Scalable**: Can increase worker concurrency as needed
3. **Fault Tolerant**: Automatic retries, graceful degradation
4. **Future-Ready**: Foundation for semantic search, analytics, ML features

## Next Steps

1. **Frontend Integration**
   - Add "Find Similar Dreams" feature
   - Display extracted themes on dream detail
   - Search interface with semantic queries

2. **Analytics**
   - Theme trends over time
   - Dream similarity clusters
   - Personal pattern detection

3. **Optimizations**
   - Batch processing for multiple dreams
   - Caching for frequent searches
   - GPU acceleration for embeddings