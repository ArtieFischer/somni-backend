-- Simple index creation for themes (Supabase-friendly)
-- Just copy and paste this into Supabase SQL editor

-- 1. Check current status
SELECT 
    'Current status' as step,
    COUNT(*) as total_themes,
    COUNT(embedding) as themes_with_embeddings,
    ROUND(COUNT(embedding) * 100.0 / COUNT(*), 2) as completion_percent
FROM themes;

-- 2. Drop any existing indexes
DROP INDEX IF EXISTS idx_themes_embedding;
DROP INDEX IF EXISTS idx_themes_embedding_ivfflat;
DROP INDEX IF EXISTS idx_themes_embedding_cosine;
DROP INDEX IF EXISTS idx_themes_embedding_hnsw;

-- 3. Run ANALYZE first
ANALYZE themes;

-- 4. Use HNSW instead of IVFFLAT (no memory limits)
-- HNSW is actually faster for most queries anyway!
CREATE INDEX idx_themes_embedding_hnsw 
ON themes 
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- 5. Verify index was created
SELECT 
    'Index created successfully' as result,
    indexname,
    indexdef
FROM pg_indexes 
WHERE tablename = 'themes' 
  AND indexname LIKE '%embedding%';

-- 6. Test a simple query (using actual theme embedding for comparison)
WITH sample_embedding AS (
  SELECT embedding FROM themes WHERE embedding IS NOT NULL LIMIT 1
)
SELECT 
  'Query test' as test_type,
  COUNT(*) as themes_found
FROM themes t, sample_embedding s
WHERE t.embedding IS NOT NULL
  AND 1 - (t.embedding <=> s.embedding) > 0.1;

-- 7. Final status
SELECT 
    'Setup complete' as status,
    'HNSW index created for fast vector search' as index_type,
    COUNT(embedding) as themes_ready
FROM themes
WHERE embedding IS NOT NULL;