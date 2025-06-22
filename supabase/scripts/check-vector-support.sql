-- Check vector extension and HNSW support

-- 1. Check if vector extension is installed
SELECT 
    extname,
    extversion,
    extnamespace::regnamespace as schema
FROM pg_extension 
WHERE extname = 'vector';

-- 2. Check available access methods (should include 'hnsw')
SELECT amname, amtype 
FROM pg_am 
WHERE amname IN ('btree', 'hash', 'gist', 'gin', 'spgist', 'brin', 'hnsw', 'ivfflat');

-- 3. Check if HNSW is available for vector type
SELECT 
    opcname,
    opcmethod::regproc as access_method,
    opcintype::regtype as data_type
FROM pg_opclass
WHERE opcname LIKE '%vector%' OR opcname LIKE '%hnsw%';

-- 4. List all indexes on themes table with their access methods
SELECT 
    i.relname as index_name,
    am.amname as access_method,
    pg_size_pretty(pg_relation_size(i.oid)) as size,
    idx.indisvalid as is_valid
FROM pg_index idx
JOIN pg_class i ON i.oid = idx.indexrelid
JOIN pg_class t ON t.oid = idx.indrelid
JOIN pg_am am ON am.oid = i.relam
WHERE t.relname = 'themes';

-- 5. Check vector extension version (needs 0.5.0+ for HNSW)
SELECT 
    extname,
    extversion,
    CASE 
        WHEN extversion >= '0.5.0' THEN 'HNSW supported'
        ELSE 'HNSW NOT supported (need 0.5.0+)'
    END as hnsw_support
FROM pg_extension 
WHERE extname = 'vector';

-- 6. If HNSW is not available, create an IVFFLAT index instead
-- This will definitely work with Supabase
DROP INDEX IF EXISTS idx_themes_embedding_hnsw;
DROP INDEX IF EXISTS idx_themes_embedding_ivfflat;

-- Create IVFFLAT index (guaranteed to work)
CREATE INDEX idx_themes_embedding_ivfflat 
ON themes 
USING ivfflat (embedding vector_cosine_ops) 
WITH (lists = 10);

-- 7. Test with IVFFLAT
ANALYZE themes;

SET enable_seqscan = OFF;
EXPLAIN (ANALYZE, BUFFERS)
SELECT code, label 
FROM themes 
WHERE embedding IS NOT NULL
ORDER BY embedding <=> (SELECT embedding FROM themes WHERE code = 'ocean')
LIMIT 5;
SET enable_seqscan = ON;