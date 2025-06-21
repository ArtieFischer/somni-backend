#!/bin/bash

# Direct SQL approach to update embeddings
# This bypasses RLS by connecting directly as superuser

# Load environment variables
source .env

# Generate embeddings and update directly via SQL
echo "Generating embeddings and updating themes directly..."

# First, let's test with a single theme
curl -X POST "${RAILWAY_API_URL}/api/embeddings/test-single-theme" \
  -H "Content-Type: application/json" \
  -H "X-API-Secret: ${API_SECRET}" \
  -d '{
    "theme": {
      "code": "falling",
      "label": "Falling",
      "description": "Dreams about falling, losing balance, or dropping from heights"
    }
  }'

echo -e "\n\nDone!"