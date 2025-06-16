#!/bin/bash

# Quick test for Jung interpretation with RAG

echo "🧪 Testing Jung Interpreter with RAG Enhancement"
echo "=============================================="

# Generate UUID
DREAM_ID=$(uuidgen | tr '[:upper:]' '[:lower:]' 2>/dev/null || echo "123e4567-e89b-12d3-a456-426614174001")

# Load API secret
if [ -f .env ]; then
  export $(grep API_SECRET_KEY .env | xargs)
else
  echo "❌ .env file not found!"
  exit 1
fi

echo "Dream ID: $DREAM_ID"
echo ""

# Send the interpretation request
curl -X POST http://localhost:3000/api/v1/interpretation/test/interpret \
  -H "Content-Type: application/json" \
  -H "X-API-Secret: $API_SECRET_KEY" \
  -d "{
    \"dreamId\": \"$DREAM_ID\",
    \"interpreterType\": \"jung\",
    \"dreamTranscription\": \"I found myself in an ancient library filled with books that glowed with inner light. As I touched one, I transformed into a wise serpent and could understand the language of symbols. My shadow appeared as a guide, leading me deeper into the labyrinth of knowledge.\",
    \"analysisDepth\": \"deep\",
    \"userContext\": {
      \"age\": 35,
      \"currentLifeSituation\": \"Seeking deeper understanding of myself\"
    }
  }" | python3 -m json.tool

echo ""
echo "✅ Check the interpretation field above - it should now contain properly parsed JungianInsights!"
echo "📊 Look for symbols array with actual symbols from the dream"
echo "💡 Check server logs for RAG context details"