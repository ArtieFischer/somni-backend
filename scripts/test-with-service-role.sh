#!/bin/bash

# Load environment variables
source .env

# For development testing, you can use the service role key directly
# WARNING: Never do this in production!

echo "=== Using Service Role Key for Testing ==="
echo "This bypasses normal auth - development only!"
echo ""

# First, let's find a user and dream ID using psql or Supabase client
echo "To test, you need:"
echo "1. A valid user ID from your database"
echo "2. A valid dream ID from that user"
echo ""

# Example test command (replace USER_ID and DREAM_ID with real values)
echo "Example curl command:"
echo ""
echo "curl -X POST http://localhost:3000/api/v1/conversations/elevenlabs/init \\"
echo "  -H \"Authorization: Bearer \$SUPABASE_SERVICE_ROLE_KEY\" \\"
echo "  -H \"Content-Type: application/json\" \\"
echo "  -d '{\"dreamId\": \"DREAM_ID\", \"interpreterId\": \"jung\"}'"
echo ""
echo "Note: The service role key will bypass RLS policies!"