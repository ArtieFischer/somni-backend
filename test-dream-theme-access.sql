-- Test if dreams can access theme embeddings via search_themes function

-- 1. Pick a theme that has an embedding
WITH test_theme AS (
  SELECT code, label, embedding
  FROM themes
  WHERE embedding IS NOT NULL
  LIMIT 1
)
-- 2. Use that embedding to search for similar themes
SELECT 
  'Testing with theme: ' || t.code || ' (' || t.label || ')' as test_info
FROM test_theme t;

-- 3. Actually run the search
SELECT code, label, score
FROM search_themes(
  (SELECT embedding FROM themes WHERE embedding IS NOT NULL LIMIT 1),
  0.1,  -- low threshold to get more results
  10    -- max results
)
ORDER BY score DESC;

-- 4. Test what a dream would see
-- This simulates a dream about falling searching for themes
SELECT 
  t.code,
  t.label,
  1 - (t.embedding <=> dream.embedding) as similarity
FROM themes t,
  (SELECT embedding FROM themes WHERE code = 'falling' AND embedding IS NOT NULL) as dream
WHERE t.embedding IS NOT NULL
ORDER BY similarity DESC
LIMIT 10;