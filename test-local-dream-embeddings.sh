#!/bin/bash

echo "=== Testing Dream-Theme Embeddings Locally ==="
echo

# Load environment variables
source .env

# Use local server
LOCAL_URL="http://localhost:3000"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo "1. Testing embed-dream endpoint locally"
echo "======================================="

# Create a unique dream ID
DREAM_ID="$(uuidgen | tr '[:upper:]' '[:lower:]')"
DREAM_TEXT="I was falling from a cliff into the ocean. The water turned into clouds and I started flying. It was scary but also freeing."

echo "Dream ID: $DREAM_ID"
echo "Dream text: $DREAM_TEXT"
echo

# First create the dream in the database
echo "Creating dream in database..."
CREATE_RESPONSE=$(curl -s -X POST "${SUPABASE_URL}/rest/v1/dreams" \
  -H "apikey: ${SUPABASE_SERVICE_ROLE_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=representation" \
  -d "{
    \"id\": \"$DREAM_ID\",
    \"user_id\": \"550e8400-e29b-41d4-a716-446655440000\",
    \"title\": \"Falling and Flying Dream\",
    \"raw_transcript\": \"$DREAM_TEXT\",
    \"created_at\": \"$(date -u +"%Y-%m-%dT%H:%M:%SZ")\",
    \"updated_at\": \"$(date -u +"%Y-%m-%dT%H:%M:%SZ")\"
  }")

echo "Dream created: $(echo $CREATE_RESPONSE | jq -r '.id' 2>/dev/null || echo 'Failed')"

# Test the embed-dream endpoint
echo -e "\nCalling embed-dream endpoint..."
EMBED_RESPONSE=$(curl -s -X POST "${LOCAL_URL}/api/v1/embeddings/embed-dream" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${SUPABASE_ANON_KEY}" \
  -H "X-API-Secret: ${API_SECRET_KEY}" \
  -d "{
    \"dream_id\": \"$DREAM_ID\",
    \"transcript\": \"$DREAM_TEXT\"
  }")

echo "Response:"
echo "$EMBED_RESPONSE" | jq '.' || echo "$EMBED_RESPONSE"

# Check results
EMBEDDING_SIZE=$(echo "$EMBED_RESPONSE" | jq -r '.embedding_size' 2>/dev/null)
THEMES_FOUND=$(echo "$EMBED_RESPONSE" | jq -r '.themes_found' 2>/dev/null)
THEMES=$(echo "$EMBED_RESPONSE" | jq -r '.themes[]? | "  - \(.code) (\(.label)): score=\(.score)"' 2>/dev/null)

echo -e "\nResults:"
echo "- Embedding size: $EMBEDDING_SIZE (expected: 384)"
echo "- Themes found: $THEMES_FOUND"
echo -e "- Theme list:\n$THEMES"

# Verify the dream was updated with embedding
echo -e "\n2. Verifying dream has embedding in database"
echo "============================================"

DREAM_CHECK=$(curl -s -X GET "${SUPABASE_URL}/rest/v1/dreams?id=eq.$DREAM_ID&select=id,title,embedding" \
  -H "apikey: ${SUPABASE_SERVICE_ROLE_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}")

HAS_EMBEDDING=$(echo "$DREAM_CHECK" | jq -r '.[0].embedding != null' 2>/dev/null)
echo "Dream has embedding: $HAS_EMBEDDING"

# Check dream-theme associations
echo -e "\n3. Checking dream-theme associations"
echo "===================================="

ASSOCIATIONS=$(curl -s -X GET "${SUPABASE_URL}/rest/v1/dream_themes?dream_id=eq.$DREAM_ID&select=*,themes(code,label)" \
  -H "apikey: ${SUPABASE_SERVICE_ROLE_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}")

echo "Dream-theme associations:"
echo "$ASSOCIATIONS" | jq -r '.[] | "  Rank \(.rank): \(.themes.code) - \(.themes.label) (score: \(.score))"' 2>/dev/null || echo "$ASSOCIATIONS"

# Expected themes check
echo -e "\n4. Checking if expected themes were found"
echo "========================================="

FOUND_THEMES=$(echo "$EMBED_RESPONSE" | jq -r '.themes[]?.code' 2>/dev/null | tr '\n' ' ')

echo "Found theme codes: $FOUND_THEMES"
echo
echo "Expected themes for this dream:"
echo "  - 'falling' (directly mentioned)"
echo "  - 'flying' (directly mentioned)"
echo "  - 'water' or 'ocean' (mentioned)"
echo "  - 'fear' or 'anxiety' (scary feeling)"
echo "  - 'transformation' (water turning to clouds)"

# Check specific themes
if [[ "$FOUND_THEMES" == *"falling"* ]]; then
  echo -e "${GREEN}✓${NC} Found 'falling' theme"
else
  echo -e "${RED}✗${NC} Missing 'falling' theme"
fi

if [[ "$FOUND_THEMES" == *"flying"* ]]; then
  echo -e "${GREEN}✓${NC} Found 'flying' theme"
else
  echo -e "${RED}✗${NC} Missing 'flying' theme"
fi

# Clean up
echo -e "\n5. Cleaning up test data"
echo "========================"

# Delete dream_themes first (foreign key constraint)
curl -s -X DELETE "${SUPABASE_URL}/rest/v1/dream_themes?dream_id=eq.$DREAM_ID" \
  -H "apikey: ${SUPABASE_SERVICE_ROLE_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}" > /dev/null

# Then delete the dream
curl -s -X DELETE "${SUPABASE_URL}/rest/v1/dreams?id=eq.$DREAM_ID" \
  -H "apikey: ${SUPABASE_SERVICE_ROLE_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}" > /dev/null

echo "Test data cleaned up"

echo -e "\n=== Test Complete ==="