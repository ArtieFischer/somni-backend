-- Check embedding status without updated_at column

-- 1. Overall stats
SELECT 
  COUNT(*) as total_themes,
  COUNT(embedding) as with_embeddings,
  COUNT(*) - COUNT(embedding) as without_embeddings,
  ROUND((COUNT(embedding)::numeric / COUNT(*)::numeric * 100), 1) as percent_complete
FROM themes;

-- 2. Themes WITH embeddings
SELECT code, label
FROM themes 
WHERE embedding IS NOT NULL
ORDER BY code;

-- 3. Themes WITHOUT embeddings (showing what's missing)
SELECT code, label
FROM themes 
WHERE embedding IS NULL
ORDER BY code;