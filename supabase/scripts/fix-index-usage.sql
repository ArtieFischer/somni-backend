-- Fix HNSW index usage for themes table

-- 1. First, ensure the table is properly analyzed
VACUUM ANALYZE themes;

-- 2. Check current planner settings
SHOW random_page_cost;
SHOW seq_page_cost;
SHOW effective_cache_size;

-- 3. Create a better HNSW index with optimized parameters
DROP INDEX IF EXISTS idx_themes_embedding_hnsw;

CREATE INDEX idx_themes_embedding_hnsw 
ON themes 
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 200);

-- 4. Analyze again after index creation
ANALYZE themes;

-- 5. Force the planner to prefer index scans for this session
SET enable_seqscan = OFF;

-- 6. Test the query again - should now use index
EXPLAIN (ANALYZE, BUFFERS) 
SELECT code, label, embedding <=> (
    SELECT embedding FROM themes WHERE code = 'ocean'
) as distance
FROM themes 
WHERE embedding IS NOT NULL
ORDER BY embedding <=> (
    SELECT embedding FROM themes WHERE code = 'ocean'
)
LIMIT 10;

-- 7. Reset the setting
SET enable_seqscan = ON;

-- 8. Alternative: Use a more selective query that's more likely to use the index
EXPLAIN (ANALYZE, BUFFERS)
SELECT t1.code, t1.label, 
       1 - (t1.embedding <=> t2.embedding) as similarity
FROM themes t1, themes t2
WHERE t2.code = 'ocean'
  AND t1.embedding IS NOT NULL
  AND 1 - (t1.embedding <=> t2.embedding) > 0.5
ORDER BY t1.embedding <=> t2.embedding
LIMIT 10;

-- 9. Check if HNSW extension is properly loaded
SELECT * FROM pg_extension WHERE extname = 'vector';

-- 10. For small datasets like yours (726 rows), sequential scan might actually be faster
-- But we can still verify the index works by forcing its use
SET enable_seqscan = OFF;
SET enable_bitmapscan = OFF;

EXPLAIN (ANALYZE, BUFFERS)
SELECT code, label 
FROM themes 
WHERE embedding IS NOT NULL
ORDER BY embedding <=> (SELECT embedding FROM themes WHERE code = 'ocean')
LIMIT 5;

SET enable_seqscan = ON;
SET enable_bitmapscan = ON;