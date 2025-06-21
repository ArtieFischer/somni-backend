-- Verify theme embeddings are working

-- 1. Check embedding coverage
SELECT 
  COUNT(*) as total_themes,
  COUNT(embedding) as themes_with_embeddings,
  ROUND(COUNT(embedding)::numeric / COUNT(*)::numeric * 100, 1) as percent_coverage
FROM themes;

-- 2. Show sample themes with embeddings
SELECT code, label, 
       CASE WHEN embedding IS NOT NULL THEN 'YES' ELSE 'NO' END as has_embedding
FROM themes
ORDER BY code
LIMIT 20;

-- 3. Test similarity between related themes
-- This should show high similarity between conceptually related themes
WITH theme_similarities AS (
  SELECT 
    t1.code as theme1,
    t1.label as label1,
    t2.code as theme2, 
    t2.label as label2,
    1 - (t1.embedding <=> t2.embedding) as similarity
  FROM themes t1
  CROSS JOIN themes t2
  WHERE t1.code = 'falling'
    AND t2.code IN ('flying', 'anxiety', 'fear', 'escape', 'trapped')
    AND t1.embedding IS NOT NULL
    AND t2.embedding IS NOT NULL
)
SELECT theme1, theme2, ROUND(similarity::numeric, 3) as similarity_score
FROM theme_similarities
ORDER BY similarity DESC;

-- 4. Find the most similar themes to 'nightmare'
SELECT 
  t2.code,
  t2.label,
  ROUND((1 - (t1.embedding <=> t2.embedding))::numeric, 3) as similarity
FROM themes t1
CROSS JOIN themes t2
WHERE t1.code = 'nightmare'
  AND t2.code != 'nightmare'
  AND t1.embedding IS NOT NULL
  AND t2.embedding IS NOT NULL
ORDER BY similarity DESC
LIMIT 10;

-- 5. Test the search_themes function
SELECT code, label, score
FROM search_themes(
  (SELECT embedding FROM themes WHERE code = 'anxiety'),
  0.3,  -- similarity threshold
  5     -- max results
);