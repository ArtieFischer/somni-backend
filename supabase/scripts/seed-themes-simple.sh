#!/bin/bash

# Seed themes without embeddings via Railway backend
echo "Seeding themes to database via Railway backend..."

# API Configuration
API_SECRET="39a7294a9bdcc74712658060bfdbaa18442f03ac03f57fcb8bc1eea98e22ee27"
BACKEND_URL="https://somni-backend-production.up.railway.app"

# Call the seed-themes endpoint
curl -X POST "$BACKEND_URL/api/v1/themes/seed-themes" \
  -H "Content-Type: application/json" \
  -H "X-API-Secret: $API_SECRET" \
  -d @themes.json \
  -w "\n\nHTTP Status: %{http_code}\n"

echo -e "\n\nDone! Themes have been inserted. You can add embeddings later when the model loading issue is resolved."