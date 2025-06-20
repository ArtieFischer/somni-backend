#!/bin/bash

# Test single dream transcription with image generation
# This simulates what happens when the frontend sends a dream for transcription

API_SECRET="39a7294a9bdcc74712658060bfdbaa18442f03ac03f57fcb8bc1eea98e22ee27"
SUPABASE_TOKEN="your-supabase-jwt-token" # You need to get this from your Supabase auth
BASE_URL="http://localhost:3000/api/v1/transcription/transcribe"

# Sample dream for testing
DREAM_TEXT="I was walking through a forest made of glass. The trees were transparent and sparkled in the sunlight. There were birds flying above but they looked like origami made from colored paper. I felt peaceful but also curious about where the path would lead."

# Convert dream to base64 audio (simulating audio input)
# For testing, we'll just use a placeholder
AUDIO_BASE64="UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=" # Minimal WAV header

echo "🎨 Testing Dream Transcription with Image Generation"
echo "=================================================="
echo ""
echo "Note: This test requires:"
echo "1. Backend server running on localhost:3000"
echo "2. Valid Supabase JWT token"
echo "3. Supabase storage bucket 'dream-images' created"
echo ""

if [ "$1" ]; then
    SUPABASE_TOKEN="$1"
else
    echo "Usage: ./test-single-image.sh <supabase-jwt-token>"
    echo ""
    echo "To get a Supabase token:"
    echo "1. Log into your app"
    echo "2. Check browser DevTools > Application > Local Storage"
    echo "3. Look for 'supabase.auth.token'"
    exit 1
fi

DREAM_ID=$(uuidgen | tr '[:upper:]' '[:lower:]')

echo "Dream ID: $DREAM_ID"
echo ""
echo "Sending transcription request..."

curl -X POST "$BASE_URL" \
  -H "Content-Type: application/json" \
  -H "X-API-Secret: $API_SECRET" \
  -H "Authorization: Bearer $SUPABASE_TOKEN" \
  -d "{
    \"dreamId\": \"$DREAM_ID\",
    \"audioBase64\": \"$AUDIO_BASE64\",
    \"duration\": 30,
    \"options\": {
      \"languageCode\": \"eng\"
    }
  }" | jq '.'

echo ""
echo "✅ Test completed!"
echo ""
echo "Check your Supabase dashboard:"
echo "1. Database > dreams table - Look for dream ID: $DREAM_ID"
echo "2. Storage > dream-images bucket - Look for $DREAM_ID.png"

chmod +x "$0"