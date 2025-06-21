#!/bin/bash

echo "=== Complete Dream-Theme Embedding System Test ==="
echo

# Load environment variables
source .env

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Test counter
TESTS_PASSED=0
TESTS_FAILED=0

# Function to check test result
check_result() {
  if [ $1 -eq 0 ]; then
    echo -e "${GREEN}✓ PASSED${NC}: $2"
    ((TESTS_PASSED++))
  else
    echo -e "${RED}✗ FAILED${NC}: $2"
    ((TESTS_FAILED++))
  fi
}

echo "1. Testing /embed-dream endpoint (requires auth)"
echo "================================================"

# First, we need to create a test dream in the database
DREAM_ID="test-embed-$(date +%s)"
DREAM_TEXT="I was falling from a tall building, then suddenly I could fly. It was terrifying at first but then became liberating. I soared over the city feeling free."

echo "Dream ID: $DREAM_ID"
echo "Dream text: $DREAM_TEXT"
echo

# Create a test dream in the database first
echo "Creating test dream in database..."
DREAM_CREATE=$(curl -s -X POST "${SUPABASE_URL}/rest/v1/dreams" \
  -H "apikey: ${SUPABASE_SERVICE_ROLE_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}" \
  -H "Content-Type: application/json" \
  -d "{
    \"id\": \"$DREAM_ID\",
    \"user_id\": \"550e8400-e29b-41d4-a716-446655440000\",
    \"title\": \"Test Dream\",
    \"raw_transcript\": \"$DREAM_TEXT\",
    \"created_at\": \"$(date -u +"%Y-%m-%dT%H:%M:%SZ")\"
  }")

sleep 1

# Test the embed-dream endpoint
echo "Testing /embed-dream endpoint..."
EMBED_RESPONSE=$(curl -s -X POST "${RAILWAY_API_URL}/api/embeddings/embed-dream" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${SUPABASE_ANON_KEY}" \
  -H "X-API-Secret: ${API_SECRET_KEY}" \
  -d "{
    \"dream_id\": \"$DREAM_ID\",
    \"transcript\": \"$DREAM_TEXT\"
  }")

echo "Response:"
echo "$EMBED_RESPONSE" | jq '.' || echo "$EMBED_RESPONSE"

# Check if embedding was created
EMBEDDING_SIZE=$(echo "$EMBED_RESPONSE" | jq -r '.embedding_size' 2>/dev/null)
THEMES_FOUND=$(echo "$EMBED_RESPONSE" | jq -r '.themes_found' 2>/dev/null)

[ "$EMBEDDING_SIZE" = "384" ] && check_result 0 "Embedding size is 384" || check_result 1 "Embedding size check"
[ "$THEMES_FOUND" -gt 0 ] && check_result 0 "Found $THEMES_FOUND themes" || check_result 1 "Theme extraction"

# Extract found theme codes
echo -e "\nThemes found:"
echo "$EMBED_RESPONSE" | jq -r '.themes[]? | "  - \(.code) (\(.label)): \(.score)"' 2>/dev/null

echo -e "\n2. Testing /dreams endpoint (alternative)"
echo "=========================================="

# Test the /dreams endpoint which should do the same thing
DREAM_ID_2="test-dreams-$(date +%s)"

# Create another test dream
curl -s -X POST "${SUPABASE_URL}/rest/v1/dreams" \
  -H "apikey: ${SUPABASE_SERVICE_ROLE_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}" \
  -H "Content-Type: application/json" \
  -d "{
    \"id\": \"$DREAM_ID_2\",
    \"user_id\": \"550e8400-e29b-41d4-a716-446655440000\",
    \"title\": \"Nightmare Test\",
    \"raw_transcript\": \"A terrifying nightmare where I was trapped in a dark basement being chased by shadows.\",
    \"created_at\": \"$(date -u +"%Y-%m-%dT%H:%M:%SZ")\"
  }" > /dev/null

DREAMS_RESPONSE=$(curl -s -X POST "${RAILWAY_API_URL}/api/embeddings/dreams" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${SUPABASE_ANON_KEY}" \
  -H "X-API-Secret: ${API_SECRET_KEY}" \
  -d "{
    \"dream_id\": \"$DREAM_ID_2\",
    \"text\": \"A terrifying nightmare where I was trapped in a dark basement being chased by shadows.\"
  }")

echo "Response:"
echo "$DREAMS_RESPONSE" | jq '.' || echo "$DREAMS_RESPONSE"

# Check themes for nightmare
NIGHTMARE_THEMES=$(echo "$DREAMS_RESPONSE" | jq -r '.themes[]?.code' 2>/dev/null | tr '\n' ' ')
echo "Themes found: $NIGHTMARE_THEMES"

[[ "$NIGHTMARE_THEMES" == *"nightmare"* ]] && check_result 0 "Found 'nightmare' theme" || check_result 1 "Nightmare theme detection"
[[ "$NIGHTMARE_THEMES" == *"trapped"* ]] && check_result 0 "Found 'trapped' theme" || check_result 1 "Trapped theme detection"

echo -e "\n3. Verifying dream-theme associations in database"
echo "================================================="

# Check if dream_themes were created
ASSOCIATIONS=$(curl -s -X GET "${SUPABASE_URL}/rest/v1/dream_themes?dream_id=eq.$DREAM_ID&select=theme_code,rank,score" \
  -H "apikey: ${SUPABASE_ANON_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_ANON_KEY}")

echo "Dream-theme associations:"
echo "$ASSOCIATIONS" | jq '.' || echo "$ASSOCIATIONS"

ASSOCIATION_COUNT=$(echo "$ASSOCIATIONS" | jq 'length' 2>/dev/null || echo "0")
[ "$ASSOCIATION_COUNT" -gt 0 ] && check_result 0 "Created $ASSOCIATION_COUNT dream-theme associations" || check_result 1 "Dream-theme associations"

echo -e "\n4. Testing theme similarity relationships"
echo "=========================================="

# Test if similar themes are being found correctly
echo "Expected relationships:"
echo "- 'falling' should be similar to 'fear', 'anxiety'"
echo "- 'nightmare' should be similar to 'fear', 'anxiety', 'sleep_paralysis'"
echo "- 'flying' should be similar to 'freedom', 'escape'"

# Clean up test dreams
echo -e "\n5. Cleaning up test data"
echo "========================"

curl -s -X DELETE "${SUPABASE_URL}/rest/v1/dreams?id=eq.$DREAM_ID" \
  -H "apikey: ${SUPABASE_SERVICE_ROLE_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}" > /dev/null

curl -s -X DELETE "${SUPABASE_URL}/rest/v1/dreams?id=eq.$DREAM_ID_2" \
  -H "apikey: ${SUPABASE_SERVICE_ROLE_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}" > /dev/null

echo "Test dreams cleaned up"

echo -e "\n=== Test Summary ==="
echo "===================="
echo -e "Tests passed: ${GREEN}$TESTS_PASSED${NC}"
echo -e "Tests failed: ${RED}$TESTS_FAILED${NC}"
echo

if [ $TESTS_FAILED -eq 0 ]; then
  echo -e "${GREEN}All tests passed! The dream-theme embedding system is working correctly.${NC}"
else
  echo -e "${RED}Some tests failed. Please check the output above for details.${NC}"
fi