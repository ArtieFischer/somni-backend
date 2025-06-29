#!/bin/bash

# Quick API test using service role key
# This works because service role bypasses RLS

echo "Testing ElevenLabs API with service role key..."
echo ""

# Load env vars
source .env

# First, let's check if server is running
curl -s http://localhost:3000/health > /dev/null
if [ $? -ne 0 ]; then
    echo "❌ Server not running! Start it with: npm run dev"
    exit 1
fi

echo "✅ Server is running"
echo ""

# You need to replace these with real IDs from your database
DREAM_ID="REPLACE_WITH_REAL_DREAM_ID"
USER_ID="REPLACE_WITH_REAL_USER_ID"

echo "📝 To get real IDs, run this SQL in Supabase dashboard:"
echo ""
echo "SELECT d.id as dream_id, d.user_id, u.email"
echo "FROM dreams d"
echo "JOIN auth.users u ON d.user_id = u.id"
echo "ORDER BY d.recorded_at DESC"
echo "LIMIT 5;"
echo ""
echo "Then update DREAM_ID in this script and run again."
echo ""

# Example API call (uncomment and update IDs)
# curl -X POST http://localhost:3000/api/v1/conversations/elevenlabs/init \
#   -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
#   -H "Content-Type: application/json" \
#   -d "{\"dreamId\": \"$DREAM_ID\", \"interpreterId\": \"jung\"}" | jq