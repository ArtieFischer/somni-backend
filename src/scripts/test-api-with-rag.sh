#!/bin/bash

# Generate a UUID for dreamId
if command -v uuidgen >/dev/null 2>&1; then
    DREAM_ID=$(uuidgen | tr '[:upper:]' '[:lower:]')
elif [ -f /proc/sys/kernel/random/uuid ]; then
    DREAM_ID=$(cat /proc/sys/kernel/random/uuid)
else
    # Fallback: generate a pseudo-UUID
    DREAM_ID=$(printf '%08x-%04x-4%03x-%04x-%012x' \
        $RANDOM $RANDOM $((RANDOM & 0x0fff)) \
        $((RANDOM & 0x3fff | 0x8000)) \
        $RANDOM $RANDOM $RANDOM)
fi

echo "🧪 Testing Jung Interpreter with RAG Enhancement"
echo "=============================================="
echo ""
echo "Make sure your server is running with: ENABLE_RAG=true npm run dev"
echo ""
echo "Sending dream interpretation request..."
echo ""

curl -X POST http://localhost:3000/api/v1/interpretation/test/interpret \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -H "X-API-Secret: 39a7294a9bdcc74712658060bfdbaa18442f03ac03f57fcb8bc1eea98e22ee27" \
  -d '{
    "dreamId": "$DREAM_ID",
    "interpreterType": "jung",
    "dreamTranscription": "I found myself in an ancient library filled with books that glowed with inner light. As I touched one, I transformed into a wise serpent and could understand the language of symbols. My shadow appeared as a guide, leading me deeper into the labyrinth of knowledge.",
    "analysisDepth": "deep",
    "userContext": {
      "age": 35,
      "currentLifeSituation": "Seeking deeper understanding of myself"
    }
  }' | python3 -m json.tool

echo ""
echo "✅ Check the response above - it should include Jung-like interpretations"
echo "   enriched with actual passages from his works!"
echo ""
echo "📊 To verify RAG was used, check your server logs for:"
echo "   'Retrieved X relevant passages for Jung interpretation'"