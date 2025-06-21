#!/bin/bash

echo "=== Testing Dream-Theme Integration ==="
echo

# Load environment variables
source .env

# Test dream texts with expected themes
declare -A test_dreams=(
  ["falling_dream"]="I was on top of a skyscraper and suddenly lost my balance. I fell endlessly through clouds, my heart racing with fear."
  ["chase_dream"]="A dark figure was chasing me through endless corridors. I tried to run but my legs felt like lead. I couldn't escape."
  ["flying_dream"]="I discovered I could fly by swimming through the air. I soared over mountains and cities, feeling completely free."
)

# Expected themes for each dream
declare -A expected_themes=(
  ["falling_dream"]="falling,fear,anxiety"
  ["chase_dream"]="being_chased,escape,anxiety,fear"
  ["flying_dream"]="flying,freedom,joy"
)

# Function to test a single dream
test_dream() {
  local dream_key=$1
  local dream_text="${test_dreams[$dream_key]}"
  local expected="${expected_themes[$dream_key]}"
  local dream_id="test-$(date +%s)-$RANDOM"
  
  echo "Testing: $dream_key"
  echo "Dream: $dream_text"
  echo "Expected themes: $expected"
  echo
  
  # Call the dream embedding endpoint
  local response=$(curl -s -X POST "${RAILWAY_API_URL}/api/embeddings/dreams" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer ${SUPABASE_ANON_KEY}" \
    -H "X-API-Secret: ${API_SECRET_KEY}" \
    -d "{
      \"dream_id\": \"$dream_id\",
      \"text\": \"$dream_text\"
    }")
  
  echo "Response:"
  echo "$response" | jq '.'
  
  # Extract found themes
  local found_themes=$(echo "$response" | jq -r '.themes[]?.code' 2>/dev/null | tr '\n' ',' | sed 's/,$//')
  echo "Found themes: $found_themes"
  echo "---"
  echo
}

# Test each dream
for dream_key in "${!test_dreams[@]}"; do
  test_dream "$dream_key"
done

# Direct database check
echo "=== Verifying Theme Search Function ==="
echo "Testing if dream embeddings can find similar themes..."

# Create a test embedding by calling the API with a known theme-like text
TEST_TEXT="nightmare anxiety fear darkness trapped"
echo "Test text: $TEST_TEXT"

curl -s -X POST "${RAILWAY_API_URL}/api/embeddings/test-single-theme" \
  -H "Content-Type: application/json" \
  -H "X-API-Secret: ${API_SECRET_KEY}" \
  -d "{
    \"theme\": {
      \"code\": \"integration_test\",
      \"label\": \"$TEST_TEXT\"
    }
  }" | jq '.embedding_size'

echo -e "\n=== Test Complete ==="
echo
echo "Success indicators:"
echo "✓ Each dream should find relevant themes"
echo "✓ Falling dream should find: falling, fear, anxiety"
echo "✓ Chase dream should find: being_chased, escape, anxiety"
echo "✓ Flying dream should find: flying, freedom"
echo "✓ Similarity scores should be > 0.15 for relevant themes"