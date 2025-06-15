#!/bin/bash

# 🧠 Dream Interpretation Test Suite - Neuroscientist Analysis
# Evidence-Based Sleep Science with Dr. Mary Carskadon's approach
# Tests various neuroscience frameworks and specialized analyses

API_SECRET="39a7294a9bdcc74712658060bfdbaa18442f03ac03f57fcb8bc1eea98e22ee27"
BASE_URL="http://localhost:3000/api/v1/interpretation/test/interpret"

echo "🔬 Starting Neuroscientist Dream Interpretation Tests..."
echo "======================================================="

# Test 1: Memory Consolidation Dream (Learning Theme)
echo ""
echo "📚 Test 1: Study/Learning Dream (Memory Consolidation Expected)"
echo "--------------------------------------------------------------"
curl -X POST "$BASE_URL" \
  -H "Content-Type: application/json" \
  -H "X-API-Secret: $API_SECRET" \
  -d "{
    \"dreamId\": \"$(uuidgen)\",
    \"dreamTranscription\": \"I was back in my college chemistry class, but instead of a normal classroom, we were in this huge laboratory with bubbling beakers everywhere. The professor was explaining complex molecular structures, but the formulas kept changing on the blackboard as I watched. I was frantically trying to take notes, but my pen kept turning into different lab equipment. Other students seemed to understand everything perfectly, while I felt like I was missing some crucial piece of information. Then I realized I had an exam tomorrow on all this material I couldnt grasp.\",
    \"interpreterType\": \"neuroscientist\",
    \"userContext\": {
      \"age\": 24
    },
    \"analysisDepth\": \"deep\"
  }" \
  --max-time 90 | jq '.'

echo ""
echo "⏰ Waiting 5 seconds before next test..."
sleep 5

# Test 2: Threat Simulation Dream (Danger/Chase Theme)
echo ""
echo "🏃 Test 2: Chase/Danger Dream (Threat Simulation Expected)"
echo "---------------------------------------------------------"
curl -X POST "$BASE_URL" \
  -H "Content-Type: application/json" \
  -H "X-API-Secret: $API_SECRET" \
  -d "{
    \"dreamId\": \"$(uuidgen)\",
    \"dreamTranscription\": \"I was being chased through a dark forest by some kind of shadowy figure. I kept running and running, jumping over fallen logs and dodging branches that seemed to reach out to grab me. My heart was pounding and I could hear the pursuer getting closer. I found a cabin and tried to hide inside, but the doors wouldnt lock properly. I kept checking the windows, seeing glimpses of movement outside. Every sound made me freeze with terror. I finally found a back exit but when I opened the door, I was right back at the beginning of the forest.\",
    \"interpreterType\": \"neuroscientist\",
    \"userContext\": {
      \"age\": 30
    },
    \"analysisDepth\": \"deep\"
  }" \
  --max-time 90 | jq '.'

echo ""
echo "⏰ Waiting 5 seconds before next test..."
sleep 5

# Test 3: Problem-Solving Dream (Creative Theme)
echo ""
echo "💡 Test 3: Creative/Innovation Dream (Problem-Solving Expected)"
echo "--------------------------------------------------------------"
curl -X POST "$BASE_URL" \
  -H "Content-Type: application/json" \
  -H "X-API-Secret: $API_SECRET" \
  -d "{
    \"dreamId\": \"$(uuidgen)\",
    \"dreamTranscription\": \"I was working on this impossible puzzle that kept changing every time I thought I figured it out. It started as a jigsaw puzzle, then became a Rubiks cube, then transformed into some kind of 3D mathematical equation floating in the air. Instead of getting frustrated, I felt this incredible sense of excitement and curiosity. I started approaching it from completely different angles, using tools that appeared out of nowhere - paintbrushes, musical instruments, even cooking utensils. Suddenly I had this aha moment where all the pieces clicked together in a way I never would have thought of while awake.\",
    \"interpreterType\": \"neuroscientist\",
    \"userContext\": {
      \"age\": 35
    },
    \"analysisDepth\": \"transformative\"
  }" \
  --max-time 90 | jq '.'

echo ""
echo "⏰ Waiting 5 seconds before next test..."
sleep 5

# Test 4: Emotional Regulation Dream (Strong Emotions)
echo ""
echo "😢 Test 4: Grief/Loss Dream (Emotional Regulation Expected)"
echo "----------------------------------------------------------"
curl -X POST "$BASE_URL" \
  -H "Content-Type: application/json" \
  -H "X-API-Secret: $API_SECRET" \
  -d "{
    \"dreamId\": \"$(uuidgen)\",
    \"dreamTranscription\": \"I was at my grandmothers house, but she had been gone for five years. She was there cooking her famous apple pie, humming the song she always hummed. I felt this overwhelming wave of love and sadness at the same time. I wanted to hug her and tell her how much I missed her, but also felt guilty for some reason. We sat at her kitchen table and she poured me tea from her favorite teapot. She didnt say much, just smiled at me with that knowing look she always had. When I woke up, I could still smell the cinnamon from her pie and felt both comforted and deeply sad.\",
    \"interpreterType\": \"neuroscientist\",
    \"userContext\": {
      \"age\": 28
    },
    \"analysisDepth\": \"deep\"
  }" \
  --max-time 90 | jq '.'

echo ""
echo "⏰ Waiting 5 seconds before next test..."
sleep 5

# Test 5: Circadian/Schedule Dream (Time-related)
echo ""
echo "⏰ Test 5: Time/Schedule Disruption Dream (Circadian Factors Expected)"
echo "---------------------------------------------------------------------"
curl -X POST "$BASE_URL" \
  -H "Content-Type: application/json" \
  -H "X-API-Secret: $API_SECRET" \
  -d "{
    \"dreamId\": \"$(uuidgen)\",
    \"dreamTranscription\": \"I kept waking up and checking my alarm clock, but the time never made sense. First it said 3:17 AM, then 11:43 PM, then somehow 25:90 which doesnt even exist. I was supposed to be at work but I couldnt figure out what time it actually was or if I had already missed everything. The sun kept going up and down outside my window like someone was playing with a light switch. I felt exhausted but couldnt fall back asleep. Every time I thought I understood what time it was, the clock would change again. I had this anxious feeling that I was completely out of sync with the world.\",
    \"interpreterType\": \"neuroscientist\",
    \"userContext\": {
      \"age\": 32
    },
    \"analysisDepth\": \"deep\"
  }" \
  --max-time 90 | jq '.'

echo ""
echo "✨ All neuroscientist dream tests completed!"
echo "==========================================="
echo ""
echo "🔬 Each interpretation should demonstrate:"
echo "   • Dr. Mary Carskadon's warm, educational voice"
echo "   • Evidence-based neuroscience frameworks applied appropriately"
echo "   • Brain activity regions identified"
echo "   • Sleep stage characteristics analyzed"
echo "   • Continuity hypothesis connections to waking life"
echo "   • Fascinating sleep science education"
echo "   • Specialized analyses ONLY when relevant to dream content:"
echo "     - Memory consolidation for learning dreams"
echo "     - Threat simulation for danger/chase dreams"
echo "     - Problem-solving for creative/innovation dreams"
echo "     - Emotional regulation for emotionally charged dreams"
echo "     - Circadian factors for time/schedule disruption dreams"
echo ""
echo "🧠 Science meets compassion - sleep research in action!" 