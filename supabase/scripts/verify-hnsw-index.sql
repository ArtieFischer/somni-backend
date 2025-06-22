-- Verify and force HNSW index usage

-- 1. Check if the index is actually on the embedding column
SELECT 
    i.relname as index_name,
    a.attname as column_name,
    am.amname as access_method,
    pg_get_indexdef(i.oid) as index_definition
FROM pg_index idx
JOIN pg_class i ON i.oid = idx.indexrelid
JOIN pg_class t ON t.oid = idx.indrelid
JOIN pg_am am ON am.oid = i.relam
JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = ANY(idx.indkey)
WHERE t.relname = 'themes' AND i.relname LIKE '%embedding%';

-- 2. Drop and recreate with explicit settings
DROP INDEX IF EXISTS idx_themes_embedding_hnsw;

-- Create with explicit operator class
CREATE INDEX idx_themes_embedding_hnsw 
ON themes 
USING hnsw (embedding vector_cosine_ops);

-- 3. Update table statistics
VACUUM ANALYZE themes;

-- 4. Use index hint with lateral join (different query structure)
EXPLAIN (ANALYZE, BUFFERS)
SELECT t.code, t.label, similarity
FROM (
    SELECT embedding FROM themes WHERE code = 'ocean'
) ref
CROSS JOIN LATERAL (
    SELECT code, label, 1 - (embedding <=> ref.embedding) as similarity
    FROM themes
    WHERE embedding IS NOT NULL
    ORDER BY embedding <=> ref.embedding
    LIMIT 10
) t;

-- 5. Alternative: Use SET LOCAL to force index for this transaction
BEGIN;
SET LOCAL enable_seqscan = OFF;
SET LOCAL enable_bitmapscan = OFF;

EXPLAIN (ANALYZE, BUFFERS)
SELECT code, label 
FROM themes 
WHERE embedding IS NOT NULL
ORDER BY embedding <=> (SELECT embedding FROM themes WHERE code = 'ocean')
LIMIT 5;

ROLLBACK;

-- 6. Check work_mem setting (might affect index usage)
SHOW work_mem;
SHOW shared_buffers;

-- 7. Last resort: Use explicit index hint with pg_hint_plan if available
-- But this is rarely needed and Supabase might not have it enabled