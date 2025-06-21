#!/bin/bash

# Test if dreams can properly search themes using embeddings

# Load environment variables
source .env

echo "=== Testing Dream-Theme Embedding Search ==="
echo

# Step 1: First verify themes have embeddings
echo "1. Checking if themes have embeddings..."
echo "SELECT code, label, (embedding IS NOT NULL) as has_embedding FROM themes LIMIT 5;" | \
  psql "$DATABASE_URL" -t

echo -e "\n2. Testing theme search via dreams endpoint..."

# Create a test dream and search for similar themes
TEST_DREAM_TEXT="I was falling from a tall building and then suddenly I could fly. It was scary at first but then became liberating."

echo "Test dream text: $TEST_DREAM_TEXT"
echo

# Call the dream embedding endpoint (this should also find themes)
RESPONSE=$(curl -s -X POST "${RAILWAY_API_URL}/api/embeddings/dreams" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${SUPABASE_ANON_KEY}" \
  -H "X-API-Secret: ${API_SECRET}" \
  -d "{
    \"dream_id\": \"test-${RANDOM}\",
    \"text\": \"$TEST_DREAM_TEXT\"
  }")

echo "Response from dreams endpoint:"
echo "$RESPONSE" | jq '.'

echo -e "\n3. Testing direct theme search RPC function..."

# First generate embedding for test text
EMBEDDING_RESPONSE=$(curl -s -X POST "${RAILWAY_API_URL}/api/embeddings/test-single-theme" \
  -H "Content-Type: application/json" \
  -H "X-API-Secret: ${API_SECRET}" \
  -d "{
    \"theme\": {
      \"code\": \"test_search\",
      \"label\": \"$TEST_DREAM_TEXT\"
    }
  }")

echo "Embedding generation response:"
echo "$EMBEDDING_RESPONSE" | jq '.embedding_size'

echo -e "\n4. Testing similarity search directly in database..."
cat << EOF | psql "$DATABASE_URL"
-- Find themes most similar to "falling" theme
WITH falling_theme AS (
  SELECT embedding FROM themes WHERE code = 'falling'
)
SELECT 
  t.code,
  t.label,
  1 - (t.embedding <=> f.embedding) as similarity
FROM themes t, falling_theme f
WHERE t.embedding IS NOT NULL
ORDER BY t.embedding <=> f.embedding
LIMIT 10;
EOF

echo -e "\n5. Testing cross-theme similarities..."
cat << EOF | psql "$DATABASE_URL"
-- Show similarity matrix for a few key themes
SELECT 
  t1.code as theme1,
  t2.code as theme2,
  ROUND((1 - (t1.embedding <=> t2.embedding))::numeric, 3) as similarity
FROM themes t1
CROSS JOIN themes t2
WHERE t1.code IN ('falling', 'flying', 'anxiety', 'escape')
  AND t2.code IN ('falling', 'flying', 'anxiety', 'escape')
  AND t1.embedding IS NOT NULL
  AND t2.embedding IS NOT NULL
ORDER BY t1.code, similarity DESC;
EOF

echo -e "\n=== Test Complete ==="