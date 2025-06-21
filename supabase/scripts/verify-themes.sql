-- Check if themes were inserted and have embeddings
SELECT 
    code,
    label,
    substring(description, 1, 50) as description_preview,
    CASE 
        WHEN embedding IS NULL THEN 'No embedding'
        WHEN embedding IS NOT NULL THEN 'Has embedding (vector)'
    END as embedding_status,
    created_at
FROM themes
ORDER BY created_at DESC
LIMIT 10;

-- Count themes with and without embeddings
SELECT 
    COUNT(*) as total_themes,
    COUNT(embedding) as themes_with_embeddings,
    COUNT(*) - COUNT(embedding) as themes_without_embeddings
FROM themes;

-- Test vector search on themes
-- Find themes similar to "nightmares and scary dreams"
WITH test_theme AS (
    SELECT embedding 
    FROM themes 
    WHERE code = 'nightmare'
    LIMIT 1
)
SELECT 
    t.code,
    t.label,
    1 - (t.embedding <=> test_theme.embedding) as similarity
FROM themes t, test_theme
WHERE t.embedding IS NOT NULL
ORDER BY similarity DESC
LIMIT 5;