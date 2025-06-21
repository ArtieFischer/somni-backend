-- Check if pgvector extension is installed
SELECT 
    extname,
    extversion 
FROM pg_extension 
WHERE extname = 'vector';

-- Check vector dimensions using pgvector functions
SELECT 
    code,
    label,
    embedding::text IS NOT NULL as has_embedding,
    -- For pgvector, we can check the string representation
    CASE 
        WHEN embedding IS NULL THEN 'No embedding'
        WHEN embedding::text LIKE '[%' THEN 'Has embedding'
        ELSE 'Unknown format'
    END as embedding_status
FROM themes
LIMIT 10;

-- Simple check: count themes with embeddings
SELECT 
    COUNT(*) as total_themes,
    COUNT(embedding) as themes_with_embeddings,
    COUNT(*) FILTER (WHERE embedding IS NULL) as themes_without_embeddings
FROM themes;

-- Test similarity between specific themes
-- This will work if embeddings are properly stored
SELECT 
    t1.code as theme1,
    t2.code as theme2,
    t1.embedding <=> t2.embedding as distance,
    1 - (t1.embedding <=> t2.embedding) as similarity
FROM themes t1, themes t2
WHERE t1.code = 'nightmare' 
    AND t2.code IN ('fear', 'anxiety', 'horror', 'terror', 'sleep_paralysis')
    AND t1.embedding IS NOT NULL
    AND t2.embedding IS NOT NULL
ORDER BY similarity DESC;