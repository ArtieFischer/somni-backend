#!/bin/bash

echo "=== Quick Theme Embedding Test ==="
echo

# Direct test without sourcing .env (to avoid the error)
RAILWAY_URL="https://somni-backend-production-cff8.up.railway.app"

# Test if themes have embeddings
echo "1. Checking themes with embeddings:"
curl -s -X GET "https://dvwzolurmfffpjqzbebw.supabase.co/rest/v1/themes?select=code,label&limit=5" \
  -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR2d3pvbHVybWZmZnBqcXpiZWJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjM4MTU0MjIsImV4cCI6MjAzOTM5MTQyMn0.C1V7HhhTdKUjR4SqFqVmTg_J8LgQPdI0b6K3W_Lq3ZU" | jq '.'

echo -e "\n2. Testing theme similarity search..."
echo "Creating a test query: 'falling from heights with intense fear'"

# This will test if the embedding endpoint is working
curl -X POST "$RAILWAY_URL/api/embeddings/test-single-theme" \
  -H "Content-Type: application/json" \
  -H "X-API-Secret: your-secret-key-from-env" \
  -d '{
    "theme": {
      "code": "test_query",
      "label": "falling from heights with intense fear"
    }
  }' 2>/dev/null | jq '.'

echo -e "\n=== Done ==="