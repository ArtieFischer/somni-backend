#!/bin/bash

# Simple test to verify theme embeddings and similarity search work

# Load environment variables
source .env

echo "=== Testing Theme Embeddings and Similarity ==="
echo

# 1. Check embedding statistics
echo "1. Embedding Statistics:"
psql "$DATABASE_URL" -t << EOF
SELECT 
  COUNT(*) as total_themes,
  COUNT(embedding) as themes_with_embeddings,
  ROUND(AVG(CASE WHEN embedding IS NOT NULL THEN 1 ELSE 0 END) * 100) as percent_complete
FROM themes;
EOF

# 2. Test similarity between related themes
echo -e "\n2. Testing similarity between related themes:"
echo "   (Higher similarity = more related, scale 0-1)"
echo
psql "$DATABASE_URL" << EOF
-- Compare falling with related themes
WITH similarities AS (
  SELECT 
    t2.code,
    t2.label,
    ROUND((1 - (t1.embedding <=> t2.embedding))::numeric, 3) as similarity
  FROM themes t1
  CROSS JOIN themes t2
  WHERE t1.code = 'falling'
    AND t2.code != 'falling'
    AND t1.embedding IS NOT NULL
    AND t2.embedding IS NOT NULL
)
SELECT * FROM similarities
ORDER BY similarity DESC
LIMIT 10;
EOF

# 3. Test theme groupings
echo -e "\n3. Natural theme clusters (showing themes that are similar):"
psql "$DATABASE_URL" << EOF
-- Find themes most similar to anxiety
SELECT 
  code,
  label,
  ROUND((1 - (t1.embedding <=> t2.embedding))::numeric, 3) as similarity
FROM themes t1, themes t2
WHERE t2.code = 'anxiety'
  AND t1.code != 'anxiety'
  AND t1.embedding IS NOT NULL
  AND t2.embedding IS NOT NULL
ORDER BY similarity DESC
LIMIT 5;
EOF

# 4. Test the search_themes RPC function
echo -e "\n4. Testing search_themes RPC function:"
echo "   (This is what dreams will use to find themes)"

# We'll use the embedding from 'nightmare' theme as a test
psql "$DATABASE_URL" << EOF
-- Test the search function with nightmare's embedding
SELECT code, label, score
FROM search_themes(
  (SELECT embedding FROM themes WHERE code = 'nightmare'),
  0.2,  -- similarity threshold
  5     -- max results
);
EOF

echo -e "\n=== Test Complete ==="
echo
echo "If you see similarity scores and theme results above, the embedding search is working correctly!"