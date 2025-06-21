-- Check which themes have embeddings and which don't

-- 1. Overall stats
SELECT 
  COUNT(*) as total_themes,
  COUNT(embedding) as with_embeddings,
  COUNT(*) - COUNT(embedding) as without_embeddings
FROM themes;

-- 2. Themes WITH embeddings
SELECT code, label, updated_at
FROM themes 
WHERE embedding IS NOT NULL
ORDER BY updated_at DESC;

-- 3. Sample of themes WITHOUT embeddings (first 20)
SELECT code, label
FROM themes 
WHERE embedding IS NULL
ORDER BY code
LIMIT 20;