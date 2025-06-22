-- Test script to find symbols from dreams using BGE-M3 embeddings
-- This script tests the new 1024D embedding system for theme/symbol discovery

-- Set optimal IVFFLAT settings for testing
SET ivfflat.probes = 5;

-- Test 1: Sample dream narratives to find matching themes
-- These are example dreams - replace with actual dream content

WITH test_dreams AS (
  SELECT 
    1 as dream_id,
    'I was falling endlessly through dark clouds, unable to control my descent. The ground approached rapidly and I felt overwhelming fear.' as narrative,
    'falling, fear, loss of control, darkness' as expected_themes
  UNION ALL
  SELECT 
    2 as dream_id,
    'I found myself flying over a beautiful landscape, soaring through the air with complete freedom and joy. The view was breathtaking.' as narrative,
    'flying, freedom, joy, nature' as expected_themes
  UNION ALL  
  SELECT
    3 as dream_id,
    'I was being chased by a shadowy figure through winding corridors. No matter how fast I ran, it was always behind me.' as narrative,
    'being_chased, fear, escape, shadows' as expected_themes
  UNION ALL
  SELECT
    4 as dream_id,
    'I stood in front of a mirror but my reflection was distorted and frightening. I couldn''t recognize myself.' as narrative,
    'mirror, identity, fear, self-image' as expected_themes
  UNION ALL
  SELECT
    5 as dream_id,
    'I was swimming in crystal clear water under bright sunshine, feeling peaceful and refreshed.' as narrative,
    'water, peace, clarity, healing' as expected_themes
)
SELECT 
  td.dream_id,
  td.narrative,
  td.expected_themes,
  'Note: Actual embedding search requires BGE-M3 model to generate embeddings for these texts' as note
FROM test_dreams td;

-- Test 2: Search for specific theme combinations
-- (These queries will work after embeddings are populated)

-- Search for themes related to "water" concepts
SELECT 
  'Water-related themes:' as test_category,
  code,
  label,
  description
FROM themes 
WHERE 
  code IN ('water', 'ocean', 'sea', 'river', 'lake', 'rain', 'flood', 'swimming')
  OR LOWER(label) LIKE '%water%'
  OR LOWER(description) LIKE '%water%'
ORDER BY code;

-- Search for themes related to "fear" and "anxiety"
SELECT 
  'Fear/Anxiety themes:' as test_category,
  code,
  label,
  description
FROM themes 
WHERE 
  code IN ('fear', 'anxiety', 'terror', 'nightmare', 'being_chased', 'trapped', 'hiding')
  OR LOWER(label) LIKE '%fear%'
  OR LOWER(label) LIKE '%anxiety%'
  OR LOWER(description) LIKE '%fear%'
ORDER BY code;

-- Search for transformation and change themes
SELECT 
  'Transformation themes:' as test_category,
  code,
  label,
  description
FROM themes 
WHERE 
  code IN ('transformation', 'metamorphosis', 'birth', 'death', 'butterfly', 'snake')
  OR LOWER(label) LIKE '%transform%'
  OR LOWER(label) LIKE '%change%'
  OR LOWER(description) LIKE '%transform%'
ORDER BY code;

-- Test 3: Performance test (when embeddings are available)
-- This tests the IVFFLAT index performance

-- Sample embedding-based search function test
CREATE OR REPLACE FUNCTION test_theme_search_performance()
RETURNS TABLE (
  test_name text,
  execution_time interval,
  results_count int
)
LANGUAGE plpgsql
AS $$
DECLARE
  start_time timestamp;
  end_time timestamp;
  result_count int;
BEGIN
  -- Test with actual embedding search (requires embeddings to be populated)
  
  start_time := clock_timestamp();
  
  -- This is a placeholder - in real usage, you'd use actual embeddings
  SELECT COUNT(*) INTO result_count
  FROM themes 
  WHERE embedding IS NOT NULL;
  
  end_time := clock_timestamp();
  
  RETURN QUERY SELECT 
    'Theme count with embeddings'::text,
    end_time - start_time,
    result_count;
    
  -- Test search function performance
  start_time := clock_timestamp();
  
  SELECT COUNT(*) INTO result_count
  FROM themes t
  WHERE t.embedding IS NOT NULL;
  
  end_time := clock_timestamp();
  
  RETURN QUERY SELECT 
    'Basic embedding filter performance'::text,
    end_time - start_time,
    result_count;
END;
$$;

-- Run the performance test
SELECT * FROM test_theme_search_performance();

-- Test 4: Verify index usage
EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)
SELECT code, label
FROM themes 
WHERE embedding IS NOT NULL
LIMIT 10;

-- Test 5: Sample queries for common dream symbols
SELECT 
  'Sample symbol queries:' as test_info,
  'Use these patterns after BGE-M3 embeddings are ingested' as instructions;

-- Common dream symbols to test with embeddings:
SELECT 
  code,
  label,
  description,
  CASE 
    WHEN code IN ('water', 'flying', 'falling', 'snake', 'death', 'birth') THEN 'Universal Symbol'
    WHEN code IN ('family', 'home', 'school', 'work') THEN 'Personal Life'
    WHEN code IN ('fear', 'joy', 'anger', 'love', 'anxiety') THEN 'Emotional'
    ELSE 'Other'
  END as symbol_category
FROM themes
WHERE code IN (
  'water', 'flying', 'falling', 'snake', 'death', 'birth',
  'family', 'home', 'school', 'work',
  'fear', 'joy', 'anger', 'love', 'anxiety',
  'mirror', 'fire', 'darkness', 'light', 'door'
)
ORDER BY symbol_category, code;

-- Test 6: Database health check
SELECT 
  'Database health check:' as check_type,
  COUNT(*) as total_themes,
  COUNT(CASE WHEN embedding IS NOT NULL THEN 1 END) as themes_with_embeddings,
  COUNT(CASE WHEN sparse_embedding IS NOT NULL THEN 1 END) as themes_with_sparse,
  AVG(array_length(string_to_array(description, ' '), 1)) as avg_description_words
FROM themes;