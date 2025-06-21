#!/bin/bash

echo "Testing dream theme matching..."
echo "This will create a test dream and find matching themes"

# Test transcript about nightmares
TEST_TRANSCRIPT="I had a terrible nightmare last night. I was being chased by a monster through a dark forest. I kept falling down and couldn't escape. It was so scary and I woke up in fear."

# Your backend URL and API secret
BACKEND_URL="https://somni-backend-production.up.railway.app"
API_SECRET="39a7294a9bdcc74712658060bfdbaa18442f03ac03f57fcb8bc1eea98e22ee27"

# Call the embed-dream endpoint
curl -X POST "$BACKEND_URL/api/v1/embeddings/embed-dream" \
  -H "Content-Type: application/json" \
  -H "X-API-Secret: $API_SECRET" \
  -H "Authorization: Bearer test-token" \
  -d "{
    \"dream_id\": \"test-dream-$(date +%s)\",
    \"transcript\": \"$TEST_TRANSCRIPT\"
  }" | jq '.themes'

echo -e "\n\nIf themes were returned, the embedding system is working!"