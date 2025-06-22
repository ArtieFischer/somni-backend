-- Post BGE-M3 ingestion setup for themes table
-- Run this AFTER all themes have been ingested with 1024D embeddings

-- 1. Verify all themes have embeddings
SELECT 
  COUNT(*) as total_themes,
  COUNT(embedding) as themes_with_embeddings,
  COUNT(*) - COUNT(embedding) as missing_embeddings
FROM themes;

-- 2. Run ANALYZE to update table statistics
ANALYZE themes;

-- 3. Create IVFFLAT index (calls the function we created)
SELECT create_themes_ivfflat_index();

-- 4. Set IVFFLAT probes for better recall
SET ivfflat.probes = 5;

-- 5. Verify index was created
SELECT 
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes 
WHERE tablename = 'themes' 
  AND indexname LIKE '%embedding%';

-- 6. Test performance with a sample query
-- (This will only work after actual embeddings are ingested)
EXPLAIN (ANALYZE, BUFFERS) 
SELECT code, label, 1 - (embedding <=> '[0,0,0,0,0,0,0,0,0,0]'::vector) as score
FROM themes 
WHERE embedding IS NOT NULL
ORDER BY embedding <=> '[0,0,0,0,0,0,0,0,0,0]'::vector
LIMIT 5;

-- 7. Show index usage statistics
SELECT 
  schemaname,
  tablename,
  indexname,
  idx_scan,
  idx_tup_read,
  idx_tup_fetch
FROM pg_stat_user_indexes 
WHERE tablename = 'themes';