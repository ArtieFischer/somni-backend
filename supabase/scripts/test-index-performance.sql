-- Test if HNSW index is working properly
-- Run this in Supabase dashboard to verify index performance

-- 1. Check if index exists
SELECT 
    'Index Status' as check_type,
    indexname,
    indexdef,
    pg_size_pretty(pg_relation_size(indexname::regclass)) as index_size
FROM pg_indexes 
WHERE tablename = 'themes' 
  AND indexname LIKE '%embedding%';

-- 2. Check index usage statistics
SELECT 
    'Index Usage' as check_type,
    schemaname,
    relname as tablename,
    indexrelname as indexname,
    idx_scan as times_used,
    idx_tup_read as tuples_read,
    idx_tup_fetch as tuples_fetched
FROM pg_stat_user_indexes 
WHERE relname = 'themes'
  AND indexrelname LIKE '%embedding%';

-- 3. Test query WITH index (should use Index Scan)
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

-- 4. Force sequential scan to compare performance
SET enable_indexscan = OFF;
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
SET enable_indexscan = ON;

-- 5. Check if index is being used for your search_themes function
EXPLAIN (ANALYZE, BUFFERS)
SELECT * FROM search_themes(
    (SELECT embedding FROM themes WHERE code = 'flying'),
    0.3,
    5
);

-- 6. Performance comparison test
WITH timing_test AS (
    SELECT 
        'Index Scan' as scan_type,
        COUNT(*) as result_count,
        EXTRACT(EPOCH FROM (clock_timestamp() - statement_timestamp())) * 1000 as query_time_ms
    FROM (
        SELECT code
        FROM themes 
        WHERE embedding IS NOT NULL
        ORDER BY embedding <=> (SELECT embedding FROM themes WHERE code = 'water')
        LIMIT 20
    ) t
)
SELECT * FROM timing_test;

-- 7. Verify HNSW specific settings
SELECT 
    'HNSW Settings' as info_type,
    name,
    setting,
    unit,
    short_desc
FROM pg_settings 
WHERE name LIKE '%hnsw%' OR name LIKE '%vector%'
ORDER BY name;

-- 8. Index health check
SELECT 
    'Index Health' as check_type,
    c.relname AS index_name,
    pg_size_pretty(pg_relation_size(c.oid)) AS index_size,
    i.indisvalid AS is_valid,
    i.indisready AS is_ready,
    i.indislive AS is_live
FROM pg_index i
JOIN pg_class c ON c.oid = i.indexrelid
JOIN pg_class t ON t.oid = i.indrelid
WHERE t.relname = 'themes' AND c.relname LIKE '%embedding%';