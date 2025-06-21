#!/bin/bash

# Test theme embeddings via API

# Load environment variables
source .env

echo "=== Testing Theme Embeddings via API ==="
echo

# 1. Test single theme search
echo "1. Testing embedding generation and search..."
echo

# Create a test text that should match multiple themes
TEST_TEXT="I had a nightmare where I was falling and being chased, filled with anxiety and fear"

# Generate embedding for test text
echo "Generating embedding for: '$TEST_TEXT'"
RESPONSE=$(curl -s -X POST "${RAILWAY_API_URL}/api/embeddings/test-single-theme" \
  -H "Content-Type: application/json" \
  -H "X-API-Secret: ${API_SECRET}" \
  -d "{
    \"theme\": {
      \"code\": \"test_dynamic\",
      \"label\": \"Test Dynamic Theme\",
      \"description\": \"$TEST_TEXT\"
    }
  }")

echo "Response:"
echo "$RESPONSE" | jq '.'

# 2. Test dream embedding with theme extraction
echo -e "\n2. Testing dream embedding with automatic theme extraction..."

DREAM_ID="test-dream-$(date +%s)"
DREAM_TEXT="I was in my childhood home but it looked different. I was being chased by a shadowy figure through endless hallways. I tried to scream but no sound came out. Then I found myself falling into darkness."

echo "Dream text: '$DREAM_TEXT'"
echo "Dream ID: $DREAM_ID"
echo

DREAM_RESPONSE=$(curl -s -X POST "${RAILWAY_API_URL}/api/embeddings/dreams" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${SUPABASE_ANON_KEY}" \
  -H "X-API-Secret: ${API_SECRET}" \
  -d "{
    \"dream_id\": \"$DREAM_ID\",
    \"text\": \"$DREAM_TEXT\"
  }")

echo "Dream embedding response:"
echo "$DREAM_RESPONSE" | jq '.'

# 3. Quick SQL check via Supabase REST API
echo -e "\n3. Checking theme embedding coverage via Supabase API..."

STATS_RESPONSE=$(curl -s -X POST "${SUPABASE_URL}/rest/v1/rpc/get_theme_stats" \
  -H "apikey: ${SUPABASE_ANON_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_ANON_KEY}" \
  -H "Content-Type: application/json" \
  -d '{}' 2>/dev/null || echo '{"error": "Function not available"}')

echo "Stats: $STATS_RESPONSE"

# 4. Direct query to check themes
echo -e "\n4. Fetching sample themes with embeddings..."

THEMES_RESPONSE=$(curl -s -X GET "${SUPABASE_URL}/rest/v1/themes?select=code,label&embedding=not.is.null&limit=10" \
  -H "apikey: ${SUPABASE_ANON_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_ANON_KEY}")

echo "Themes with embeddings (first 10):"
echo "$THEMES_RESPONSE" | jq '.[].code' 2>/dev/null | head -10

echo -e "\n=== Test Complete ==="
echo
echo "Key indicators of success:"
echo "- Embedding size should be 384"
echo "- Dream response should include 'themes_found' > 0"
echo "- Themes found should be relevant to the dream content"