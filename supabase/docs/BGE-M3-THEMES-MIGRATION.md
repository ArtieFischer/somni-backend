# BGE-M3 Themes Migration Guide

This document outlines the migration of the `themes` table from 384D MiniLM embeddings to 1024D BGE-M3 embeddings with IVFFLAT indexing.

## Overview

- **Old System**: 384-dimensional MiniLM embeddings
- **New System**: 1024-dimensional BGE-M3 embeddings with hybrid search capabilities
- **Index Type**: IVFFLAT for better performance on large datasets
- **Additional Features**: Sparse embeddings, versioning, metadata

## Migration Steps

### 1. Prepare Database (Migration File)
Run: `20240101000002_clean_and_prepare_bge.sql`

This migration:
- Creates backup of existing themes data
- Drops old 384D embedding column and index
- Adds new 1024D embedding column
- Adds sparse_embedding column (JSONB)
- Adds embedding_version and metadata columns
- Updates search_themes() function for 1024D
- Creates helper function for IVFFLAT index creation

### 2. Setup Ingestion Infrastructure
Run: `supabase/scripts/ingest-themes-bge.sql`

This script:
- Creates ingestion progress tracking table
- Provides functions for batch/individual embedding updates
- Sets up monitoring queries
- Creates helper functions for Node.js integration

### 3. Generate BGE-M3 Embeddings
Use: `supabase/scripts/node-bge-ingestion-example.md`

This provides:
1. Node.js script to generate 1024D BGE-M3 embeddings
2. Batch processing with progress tracking
3. Error handling and retry logic
4. Integration with your existing BGE service

### 4. Create Indexes (Post-Ingestion)
Run: `supabase/scripts/post-bge-ingestion.sql`

This script:
- Verifies all themes have embeddings
- Runs ANALYZE for statistics
- Creates IVFFLAT index automatically
- Sets optimal probe settings
- Tests index performance

### 5. Test Symbol Search
Run: `supabase/scripts/test-theme-symbol-search.sql`

This script provides:
- Sample dream narratives for testing
- Performance benchmarks
- Symbol category queries
- Database health checks

## Database Schema Changes

### Before Migration
```sql
CREATE TABLE themes (
    code text PRIMARY KEY,
    label text NOT NULL,
    description text,
    embedding vector(384),  -- Old MiniLM
    created_at timestamptz DEFAULT now()
);
```

### After Migration
```sql
CREATE TABLE themes (
    code text PRIMARY KEY,
    label text NOT NULL,
    description text,
    embedding vector(1024),          -- New BGE-M3
    sparse_embedding JSONB,          -- Sparse vectors
    embedding_version TEXT DEFAULT 'bge-m3',
    metadata JSONB DEFAULT '{}',
    created_at timestamptz DEFAULT now()
);
```

## Index Configuration

### IVFFLAT Index
- **Lists**: Calculated as `sqrt(row_count)` with minimum of 10
- **Probes**: Set to 5 for better recall
- **Distance**: Cosine similarity (`vector_cosine_ops`)

```sql
-- Example index creation
CREATE INDEX idx_themes_embedding_ivfflat 
ON themes 
USING ivfflat (embedding vector_cosine_ops) 
WITH (lists = 28);  -- For ~760 themes

-- Optimal settings
SET ivfflat.probes = 5;
```

### When to Use IVFFLAT vs HNSW
- **IVFFLAT**: Better for exact similarity search, lower memory usage
- **HNSW**: Better for approximate search, faster queries
- **Threshold**: Use IVFFLAT when you have 50+ vectors

## Search Function Updates

### New search_themes() Function
```sql
CREATE OR REPLACE FUNCTION search_themes(
  query_embedding vector(1024),  -- Updated to 1024D
  similarity_threshold float DEFAULT 0.15,
  max_results int DEFAULT 10
)
RETURNS TABLE (
  code text,
  label text,
  score float
)
```

### Usage Example
```sql
-- Search for themes similar to a dream about "flying over water"
SELECT * FROM search_themes(
  get_bge_embedding('flying over beautiful blue water'),
  0.7,
  5
);
```

## Performance Expectations

### Index Performance
- **IVFFLAT**: O(lists) search complexity
- **Memory**: ~1KB per 1024D vector
- **Build Time**: ~1-2 seconds for 760+ themes
- **Query Time**: <10ms for most searches

### Recommended Settings
```sql
-- For production use
SET ivfflat.probes = 5;        -- Balance of speed/accuracy
SET work_mem = '256MB';        -- For index creation
SET maintenance_work_mem = '512MB';
```

## Testing and Validation

### 1. Verify Migration
```sql
-- Check table structure
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'themes';

-- Verify embedding dimensions
SELECT vector_dims(embedding) as dims
FROM themes 
WHERE embedding IS NOT NULL 
LIMIT 1;
```

### 2. Test Search Functionality
```sql
-- Test basic search (after ingestion)
SELECT code, label, 
       1 - (embedding <=> query_vector) as similarity
FROM themes 
WHERE embedding IS NOT NULL
ORDER BY embedding <=> query_vector
LIMIT 5;
```

### 3. Performance Testing
```sql
EXPLAIN (ANALYZE, BUFFERS) 
SELECT * FROM search_themes(sample_embedding, 0.7, 10);
```

## Rollback Plan

If migration fails:
1. Drop new columns: `ALTER TABLE themes DROP COLUMN embedding;`
2. Restore from backup: `INSERT INTO themes SELECT * FROM themes_backup_pre_bge;`
3. Recreate old index: `CREATE INDEX ... USING ivfflat (embedding vector_cosine_ops) WITH (lists = 50);`

## Common Issues

### 1. Index Creation Fails
- **Cause**: Not enough data or dimension mismatch
- **Solution**: Check embedding dimensions and row count

### 2. Slow Queries
- **Cause**: Incorrect probe settings or missing ANALYZE
- **Solution**: Run `ANALYZE themes` and adjust `ivfflat.probes`

### 3. Memory Issues
- **Cause**: Large embedding dimensions
- **Solution**: Increase `work_mem` during index creation

## Files Created/Updated
- `supabase/migrations/20240101000002_clean_and_prepare_bge.sql` - Migration script
- `supabase/scripts/ingest-themes-bge.sql` - Ingestion infrastructure setup
- `supabase/scripts/post-bge-ingestion.sql` - Post-ingestion index creation
- `supabase/scripts/test-theme-symbol-search.sql` - Testing and validation
- `supabase/scripts/node-bge-ingestion-example.md` - Node.js integration guide
- `supabase/docs/BGE-M3-THEMES-MIGRATION.md` - This documentation