-- Post BGE-M3 ingestion setup (Dashboard-friendly version)
-- Run this AFTER all themes have been ingested with 1024D embeddings
-- Copy and paste into Supabase SQL editor

-- 1. Check completion status
SELECT 
    'Pre-index creation check' as step,
    COUNT(*) as total_themes,
    COUNT(embedding) as themes_with_embeddings,
    COUNT(*) - COUNT(embedding) as missing_embeddings,
    ROUND(COUNT(embedding) * 100.0 / COUNT(*), 2) as completion_percent
FROM themes;

-- 2. Run ANALYZE to update table statistics
ANALYZE themes;

-- 3. Set IVFFLAT probes for better recall
SET ivfflat.probes = 5;

-- 4. Create IVFFLAT index with memory optimization
-- Note: Supabase has limited maintenance_work_mem, so we'll use fewer lists

-- First drop any existing embedding index
DROP INDEX IF EXISTS idx_themes_embedding;
DROP INDEX IF EXISTS idx_themes_embedding_ivfflat;
DROP INDEX IF EXISTS idx_themes_embedding_cosine;

-- Create IVFFLAT index with fewer lists to reduce memory usage
-- Using lists=10 instead of 28 to fit within 32MB maintenance_work_mem
-- This is still effective for ~726 themes
CREATE INDEX idx_themes_embedding_ivfflat 
ON themes 
USING ivfflat (embedding vector_cosine_ops) 
WITH (lists = 10);

-- 5. Verify index was created
SELECT 
    'Index verification' as step,
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes 
WHERE tablename = 'themes' 
  AND indexname LIKE '%embedding%';

-- 6. Test basic query performance
EXPLAIN (ANALYZE, BUFFERS) 
SELECT code, label, 1 - (embedding <=> '[0,0,0,0,0,0,0,0,0,0]'::vector) as score
FROM themes 
WHERE embedding IS NOT NULL
ORDER BY embedding <=> '[0,0,0,0,0,0,0,0,0,0]'::vector
LIMIT 5;

-- 7. Final completion check
SELECT 
    'Final status' as step,
    COUNT(*) as total_themes,
    COUNT(embedding) as themes_with_embeddings,
    COUNT(*) - COUNT(embedding) as missing_embeddings,
    ROUND(COUNT(embedding) * 100.0 / COUNT(*), 2) as completion_percent,
    'Index created successfully' as index_status
FROM themes;

-- 8. Show index usage (may be 0 initially until queries are run)
SELECT 
    'Index statistics' as step,
    schemaname,
    tablename,
    indexname,
    idx_scan as times_used,
    idx_tup_read as tuples_read
FROM pg_stat_user_indexes 
WHERE tablename = 'themes'
  AND indexname LIKE '%embedding%';