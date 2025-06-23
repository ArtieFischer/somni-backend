-- Test similarity range between fragments and themes

-- 1. Quick sample of similarities
WITH sample_pairs AS (
  SELECT 
    f.id as fragment_id,
    t.code as theme_code,
    1 - (f.embedding <=> t.embedding) as similarity
  FROM (
    SELECT id, embedding 
    FROM knowledge_fragments 
    WHERE embedding IS NOT NULL 
    LIMIT 10
  ) f
  CROSS JOIN (
    SELECT code, embedding 
    FROM themes 
    WHERE embedding IS NOT NULL 
    LIMIT 50
  ) t
)
SELECT 
  'Sample Statistics' as analysis,
  MIN(similarity) as min_similarity,
  MAX(similarity) as max_similarity,
  AVG(similarity) as avg_similarity,
  PERCENTILE_CONT(0.9) WITHIN GROUP (ORDER BY similarity) as percentile_90
FROM sample_pairs;

-- 2. Count matches at different thresholds for 10 fragments
WITH threshold_counts AS (
  SELECT 
    0.25 as threshold,
    COUNT(*) as matches
  FROM knowledge_fragments f
  CROSS JOIN themes t
  WHERE f.embedding IS NOT NULL
    AND t.embedding IS NOT NULL
    AND f.id IN (SELECT id FROM knowledge_fragments WHERE embedding IS NOT NULL LIMIT 10)
    AND 1 - (f.embedding <=> t.embedding) >= 0.25
  
  UNION ALL
  
  SELECT 
    0.30 as threshold,
    COUNT(*) as matches
  FROM knowledge_fragments f
  CROSS JOIN themes t
  WHERE f.embedding IS NOT NULL
    AND t.embedding IS NOT NULL
    AND f.id IN (SELECT id FROM knowledge_fragments WHERE embedding IS NOT NULL LIMIT 10)
    AND 1 - (f.embedding <=> t.embedding) >= 0.30
    
  UNION ALL
  
  SELECT 
    0.35 as threshold,
    COUNT(*) as matches
  FROM knowledge_fragments f
  CROSS JOIN themes t
  WHERE f.embedding IS NOT NULL
    AND t.embedding IS NOT NULL
    AND f.id IN (SELECT id FROM knowledge_fragments WHERE embedding IS NOT NULL LIMIT 10)
    AND 1 - (f.embedding <=> t.embedding) >= 0.35
)
SELECT 
  threshold,
  matches,
  matches / 10.0 as avg_per_fragment
FROM threshold_counts
ORDER BY threshold;

-- 3. Show top matches for one fragment
SELECT 
  'Top matches for a sample fragment' as example,
  t.code,
  t.label,
  1 - (f.embedding <=> t.embedding) as similarity
FROM (
  SELECT id, text, embedding 
  FROM knowledge_fragments 
  WHERE embedding IS NOT NULL 
  LIMIT 1
) f
CROSS JOIN themes t
WHERE t.embedding IS NOT NULL
ORDER BY similarity DESC
LIMIT 20;