#!/bin/bash

echo "=== Testing Theme Embeddings System ==="
echo

# Load only the variables we need, avoiding the problematic line
SUPABASE_URL=$(grep "^SUPABASE_URL=" .env | cut -d'=' -f2)
SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRxd2xucmx2dGRzcWdxcHVyeW5lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkyMTIzMDksImV4cCI6MjA2NDc4ODMwOX0.Ec11kHCWtBKJH2SK4YD3WKQnwDHbGOE1XR3nKPOC5RI"
RAILWAY_API_URL=$(grep "^RAILWAY_API_URL=" .env | cut -d'=' -f2 || echo "https://somni-backend-production-cff8.up.railway.app")
API_SECRET=$(grep "^API_SECRET_KEY=" .env | cut -d'=' -f2)

echo "Using Supabase URL: $SUPABASE_URL"
echo "Using Railway API: $RAILWAY_API_URL"
echo

# 1. Check theme embedding coverage
echo "1. Checking theme embedding coverage..."
THEMES_COUNT=$(curl -s -X GET "${SUPABASE_URL}/rest/v1/themes?select=code" \
  -H "apikey: ${SUPABASE_ANON_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_ANON_KEY}" \
  -H "Range: 0-999" | jq '. | length')

echo "Total themes in database: $THEMES_COUNT"

# 2. Test theme similarity via the API
echo -e "\n2. Testing theme similarity search..."
echo "Searching for themes similar to: 'nightmare about falling and being chased'"

SEARCH_RESPONSE=$(curl -s -X POST "${RAILWAY_API_URL}/api/embeddings/test-single-theme" \
  -H "Content-Type: application/json" \
  -H "X-API-Secret: ${API_SECRET}" \
  -d '{
    "theme": {
      "code": "test_search_query",
      "label": "nightmare about falling and being chased"
    }
  }')

echo "API Response:"
echo "$SEARCH_RESPONSE" | jq '.'

# 3. Test dream analysis with theme extraction  
echo -e "\n3. Testing dream analysis with theme extraction..."

DREAM_TEXT="I was trapped in a dark basement, trying to escape but the doors kept multiplying. A shadowy figure was chasing me and I couldn't run fast enough. I woke up in a cold sweat."

# First, let's create a test dream in the database
TEST_USER_ID="550e8400-e29b-41d4-a716-446655440000"  # Fake UUID for testing
DREAM_ID="test-$(date +%s)"

echo "Dream text: '$DREAM_TEXT'"
echo "Attempting to analyze dream and extract themes..."

DREAM_ANALYSIS=$(curl -s -X POST "${RAILWAY_API_URL}/api/embeddings/dreams" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${SUPABASE_ANON_KEY}" \
  -H "X-API-Secret: ${API_SECRET}" \
  -d "{
    \"dream_id\": \"$DREAM_ID\",
    \"text\": \"$DREAM_TEXT\"
  }")

echo "Dream analysis response:"
echo "$DREAM_ANALYSIS" | jq '.'

# 4. List some themes to verify they exist
echo -e "\n4. Sample themes with embeddings:"
curl -s -X GET "${SUPABASE_URL}/rest/v1/themes?select=code,label&limit=10&order=code" \
  -H "apikey: ${SUPABASE_ANON_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_ANON_KEY}" | jq -r '.[] | "\(.code): \(.label)"'

echo -e "\n=== Test Complete ==="
echo
echo "Success indicators:"
echo "✓ Embedding size should be 384"
echo "✓ Themes should be found for dream content" 
echo "✓ Similar themes should have high similarity scores"