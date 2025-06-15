#!/bin/bash

# 🧠 Single Dream Test - Neuroscientist Sleep Science Analysis
# Perfect for testing the evidence-based neuroscience interpretation

API_SECRET="39a7294a9bdcc74712658060bfdbaa18442f03ac03f57fcb8bc1eea98e22ee27"
BASE_URL="http://localhost:3000/api/v1/interpretation/test/interpret"

echo "🧠 Testing: Family House with Animals & Hair Loss (Neuroscience Perspective)"
echo "=========================================================================="
echo ""

curl -X POST "$BASE_URL" \
  -H "Content-Type: application/json" \
  -H "X-API-Secret: $API_SECRET" \
  -d "{
    \"dreamId\": \"$(uuidgen)\",
    \"dreamTranscription\": \"I was back at my parents house, but it was way bigger than I remember. There were all these random animals just running around everywhere - like squirrels, a couple of cats, and this one really fat hamster that kept following me. I was playing with them, having a great time, when I went to the bathroom and looked in the mirror. Thats when I noticed I was losing my hair, like chunks of it just falling out. But weirdly I wasnt that upset about it, just kind of curious. Then my mom called me for dinner and all the animals lined up behind me like we were going to a parade.\",
    \"interpreterType\": \"neuroscientist\",
    \"userContext\": {
      \"age\": 28
    },
    \"analysisDepth\": \"deep\"
  }" \
  --max-time 90 | jq '.' 

echo ""
echo "🔬 Look for these neuroscience features:"
echo "   💡 Dr. Mary Carskadon's warm, educational voice"
echo "   🧠 Brain activity regions and sleep stage analysis"
echo "   🔗 Continuity hypothesis connecting dream to waking life"
echo "   📚 Fascinating sleep science education"
echo "   ❓ Reflective questions about sleep patterns"
echo "   🎯 Optional specialized analyses based on dream content:"
echo "       • Memory consolidation (if learning themes detected)"
echo "       • Threat simulation (if danger/challenge themes)"
echo "       • Emotional regulation (if strong emotions)"
echo "       • Problem-solving (if creative elements)"
echo "" 