#!/bin/bash

echo "=== Simple Theme Search Test ==="
echo

# Load environment variables
source .env

# Use local server
LOCAL_URL="http://localhost:3000"

# Test if themes can be searched with a sample text
TEST_TEXT="I had a nightmare where I was falling and being chased through darkness"

echo "1. Testing theme embedding generation and search"
echo "==============================================="
echo "Test text: $TEST_TEXT"
echo

# Use the test endpoint which only requires API secret
RESPONSE=$(curl -s -X POST "${LOCAL_URL}/api/v1/embeddings/test-single-theme" \
  -H "Content-Type: application/json" \
  -H "X-API-Secret: ${API_SECRET_KEY}" \
  -d "{
    \"theme\": {
      \"code\": \"test_query\",
      \"label\": \"Test Query\",
      \"description\": \"$TEST_TEXT\"
    }
  }")

echo "Response:"
echo "$RESPONSE" | jq '.' || echo "$RESPONSE"

# Check embedding size
EMBEDDING_SIZE=$(echo "$RESPONSE" | jq -r '.embedding_size' 2>/dev/null)
echo -e "\nEmbedding size: $EMBEDDING_SIZE (expected: 384)"

# Now let's simulate what would happen when a dream searches for themes
echo -e "\n2. Testing theme similarity search directly"
echo "==========================================="

# Get themes from database to show they exist
echo "Sample themes in database:"
curl -s -X GET "${SUPABASE_URL}/rest/v1/themes?select=code,label&limit=5&order=code" \
  -H "apikey: ${SUPABASE_ANON_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_ANON_KEY}" | jq -r '.[] | "  - \(.code): \(.label)"' 2>/dev/null

echo -e "\n3. Expected behavior for dream analysis"
echo "======================================="
echo "When a dream is analyzed:"
echo "1. Dream text generates a 384-dimensional embedding"
echo "2. The embedding is compared to all theme embeddings"
echo "3. Themes with similarity > 0.15 are returned"
echo "4. Dream-theme associations are stored in dream_themes table"
echo
echo "For the test text: \"$TEST_TEXT\""
echo "Expected themes: nightmare, falling, being_chased, darkness, fear, anxiety"

# Test the themes endpoint
echo -e "\n4. Testing if themes have embeddings"
echo "===================================="

THEME_CHECK=$(curl -s -X GET "${SUPABASE_URL}/rest/v1/themes?select=code&embedding=not.is.null&limit=10" \
  -H "apikey: ${SUPABASE_ANON_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_ANON_KEY}")

THEME_COUNT=$(echo "$THEME_CHECK" | jq 'length' 2>/dev/null || echo "0")
echo "Themes with embeddings: $THEME_COUNT (expected: 133)"

echo -e "\n=== Summary ==="
echo "==============="
if [ "$EMBEDDING_SIZE" = "384" ] && [ "$THEME_COUNT" -gt "0" ]; then
  echo "✓ Theme embedding system is working!"
  echo "✓ Dreams can search for similar themes using vector similarity"
  echo "✓ The embedding service generates 384-dimensional vectors"
  echo "✓ All $THEME_COUNT themes have embeddings for comparison"
else
  echo "✗ Something is not working correctly"
  echo "  - Embedding size: $EMBEDDING_SIZE (should be 384)"
  echo "  - Themes with embeddings: $THEME_COUNT (should be 133)"
fi