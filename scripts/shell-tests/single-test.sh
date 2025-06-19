#!/bin/bash

# 🌙 Single Dream Test - Hair Loss Family House Dream
# Usage: ./single-test.sh [interpreter]
# If no interpreter specified, tests all interpreters

API_SECRET="39a7294a9bdcc74712658060bfdbaa18442f03ac03f57fcb8bc1eea98e22ee27"
BASE_URL="http://localhost:3000/api/v1/interpretation/test/interpret"

# Get interpreter parameter or use all
INTERPRETER=$1
INTERPRETERS=("jung" "freud" "mary")

if [ ! -z "$INTERPRETER" ]; then
    INTERPRETERS=("$INTERPRETER")
fi

DREAM_TEXT="I was back at my parents house, but it was way bigger than I remember. There were all these random animals just running around everywhere - like squirrels, a couple of cats, and this one really fat hamster that kept following me. I was playing with them, having a great time, when I went to the bathroom and looked in the mirror. Thats when I noticed I was losing my hair, like chunks of it just falling out. But weirdly I wasnt that upset about it, just kind of curious. Then my mom called me for dinner and all the animals lined up behind me like we were going to a parade."

echo "🏠 Testing: Family House with Animals & Hair Loss"
echo "================================================="
echo ""

for interpreter in "${INTERPRETERS[@]}"; do
    echo "🔮 Testing with interpreter: $interpreter"
    echo "-----------------------------------------"
    
    curl -X POST "$BASE_URL" \
      -H "Content-Type: application/json" \
      -H "X-API-Secret: $API_SECRET" \
      -d "{
        \"dreamId\": \"$(uuidgen | tr '[:upper:]' '[:lower:]')\",
        \"dreamTranscription\": \"$DREAM_TEXT\",
        \"interpreterType\": \"$interpreter\",
        \"userContext\": {
          \"age\": 28
        },
        \"analysisDepth\": \"deep\"
      }" \
      --max-time 90 | jq '.' 
    
    echo ""
    echo ""
done

echo "✅ Test complete!"