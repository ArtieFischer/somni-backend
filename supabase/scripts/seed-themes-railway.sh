#!/bin/bash

# Step 1: First seed themes to database (without embeddings)
echo "Step 1: Seeding themes to database..."
export SUPABASE_URL="https://tqwlnrlvtdsqgqpuryne.supabase.co"
export SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRxd2xucmx2dGRzcWdxcHVyeW5lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkyMTIzMDksImV4cCI6MjA2NDc4ODMwOX0.h7Kc-NREKkRNPsXcwClUAtQ7pDbu2BFym231q3gT5jQ"

npx ts-node seed-themes.ts

echo -e "\n\nStep 2: Generate embeddings via Railway backend..."
echo "Calling: https://somni-backend-production.up.railway.app/api/v1/embeddings/embed-themes"

# You need to provide your API secret
API_SECRET="39a7294a9bdcc74712658060bfdbaa18442f03ac03f57fcb8bc1eea98e22ee27"

curl -X POST https://somni-backend-production.up.railway.app/api/v1/embeddings/embed-themes \
  -H "Content-Type: application/json" \
  -H "X-API-Secret: $API_SECRET" \
  -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
  -H "X-Supabase-Token: $SUPABASE_ANON_KEY" \
  -d @themes.json \
  -w "\n\nHTTP Status: %{http_code}\n"

echo -e "\n\nDone! Check your database to verify themes have embeddings."