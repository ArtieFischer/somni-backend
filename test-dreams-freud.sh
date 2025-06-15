#!/bin/bash

# 🧠 Freudian Dream Interpretation Test Suite
# Comprehensive psychoanalytic analysis with Dr. Freud's approach
# Run these to test the psychoanalytic interpretation system

API_SECRET="39a7294a9bdcc74712658060bfdbaa18442f03ac03f57fcb8bc1eea98e22ee27"
BASE_URL="http://localhost:3000/api/v1/interpretation/test/interpret"

echo "🌟 Starting Freudian Dream Interpretation Tests..."
echo "================================================="

# Test 1: Classic Family Dream with Sexual Symbolism
echo ""
echo "🏠 Test 1: Family House with Animals & Hair Loss (Freudian Analysis)"
echo "-------------------------------------------------------------------"
curl -X POST "$BASE_URL" \
  -H "Content-Type: application/json" \
  -H "X-API-Secret: $API_SECRET" \
  -d '{
    "dreamId": "123e4567-e89b-12d3-a456-426614174001",
    "dreamTranscription": "I was back at my parents house, but it was way bigger than I remember. There were all these random animals just running around everywhere - like squirrels, a couple of cats, and this one really fat hamster that kept following me. I was playing with them, having a great time, when I went to the bathroom and looked in the mirror. Thats when I noticed I was losing my hair, like chunks of it just falling out. But weirdly I wasnt that upset about it, just kind of curious. Then my mom called me for dinner and all the animals lined up behind me like we were going to a parade.",
    "interpreterType": "freud",
    "userContext": {
      "age": 28
    },
    "analysisDepth": "deep"
  }' \
  --max-time 90 | jq '.'

echo ""
echo "⏰ Waiting 5 seconds before next test..."
sleep 5

# Test 2: Workplace Authority Dream  
echo ""
echo "💼 Test 2: Office Turned Into Jungle Gym (Authority & Control)"
echo "-------------------------------------------------------------"
curl -X POST "$BASE_URL" \
  -H "Content-Type: application/json" \
  -H "X-API-Secret: $API_SECRET" \
  -d '{
    "dreamId": "123e4567-e89b-12d3-a456-426614174002", 
    "dreamTranscription": "I was at work but instead of desks there were these huge playground slides everywhere. My boss was dressed like a pirate and kept asking me to find his treasure map. I kept sliding down these slides trying to get to my computer, but every time I got close, the slide would take me somewhere else. Then I realized I was wearing my pajamas to this pirate office and everyone was staring at me. But instead of being embarrassed, I just started laughing uncontrollably and slid down the biggest slide which led straight into a ball pit full of office supplies.",
    "interpreterType": "freud",
    "userContext": {
      "age": 32
    },
    "analysisDepth": "transformative"
  }' \
  --max-time 90 | jq '.'

echo ""
echo "⏰ Waiting 5 seconds before next test..."
sleep 5

# Test 3: School Anxiety & Performance
echo ""
echo "📚 Test 3: Unprepared for Weird Exam (Performance Anxiety)"
echo "---------------------------------------------------------"
curl -X POST "$BASE_URL" \
  -H "Content-Type: application/json" \
  -H "X-API-Secret: $API_SECRET" \
  -d '{
    "dreamId": "123e4567-e89b-12d3-a456-426614174003",
    "dreamTranscription": "I was back in high school but I was my current age. There was this huge exam I had to take but instead of questions, I had to identify different types of pasta shapes. Everyone else seemed to know exactly what they were doing, writing furiously, while I just sat there staring at pictures of fusilli and penne. Then the teacher, who looked exactly like my third grade teacher Mrs. Johnson, told me I could use my phone to call my mom for help. But when I tried calling, my phone kept turning into different objects - first a banana, then a stapler, then a tiny umbrella. I woke up right as I was about to ask the person next to me if their phone was also a fruit.",
    "interpreterType": "freud",
    "userContext": {
      "age": 26
    },
    "analysisDepth": "deep"
  }' \
  --max-time 90 | jq '.'

echo ""
echo "⏰ Waiting 5 seconds before next test..."
sleep 5

# Test 4: Transportation & Control
echo ""
echo "🚗 Test 4: Car That Keeps Changing (Control & Identity)"
echo "-------------------------------------------------------"
curl -X POST "$BASE_URL" \
  -H "Content-Type: application/json" \
  -H "X-API-Secret: $API_SECRET" \
  -d '{
    "dreamId": "123e4567-e89b-12d3-a456-426614174004",
    "dreamTranscription": "I was driving to meet my friends but my car kept changing into different things while I was driving. First it was my normal car, then suddenly it was a shopping cart, so I had to push myself down the highway. Then it turned into one of those swan boats from the park, so I was pedaling it down the road while cars honked at me. People were waving from their windows like this was totally normal. When I finally got to where I was supposed to meet my friends, they were all there but they were miniature versions of themselves, like action figures. They were yelling up at me that I was late, but I couldnt hear them properly because they were so tiny. I kept trying to pick them up to hear better but they would just run away.",
    "interpreterType": "freud", 
    "userContext": {
      "age": 30
    },
    "analysisDepth": "deep"
  }' \
  --max-time 90 | jq '.'

echo ""
echo "⏰ Waiting 5 seconds before next test..."
sleep 5

# Test 5: Celebrity & Authority Figures
echo ""
echo "⭐ Test 5: Celebrity Cooking Disaster (Father Figure Dynamics)"
echo "-------------------------------------------------------------"
curl -X POST "$BASE_URL" \
  -H "Content-Type: application/json" \
  -H "X-API-Secret: $API_SECRET" \
  -d '{
    "dreamId": "123e4567-e89b-12d3-a456-426614174005",
    "dreamTranscription": "I was in a cooking competition with Gordon Ramsay, but instead of a kitchen we were in my childhood bedroom. He kept yelling at me about my terrible risotto technique, but I was trying to cook with toy pots and pans from when I was 8. Every time I tried to explain that these werent real cooking utensils, he would just get angrier and start throwing stuffed animals at me. Then my old teddy bear came to life and started giving me cooking advice, but it was all wrong - like telling me to add glitter to the soup and use crayons as seasoning. The weirdest part was that Gordon Ramsay started nodding approvingly at the teddy bears suggestions and said I was finally getting somewhere. I woke up right as I was about to serve him a bowl of crayon soup.",
    "interpreterType": "freud",
    "userContext": {
      "age": 34
    },
    "analysisDepth": "transformative"
  }' \
  --max-time 90 | jq '.'

echo ""
echo "✨ All Freudian dream tests completed!"
echo "====================================="
echo ""
echo "🧠 Each interpretation should now demonstrate:"
echo "   • Authentic Dr. Freud voice ('I detect...', 'It is clear that...')"
echo "   • Age-specific psychosexual development insights"
echo "   • Unconscious desires and repressed wishes identification"
echo "   • Sexual symbolism and Oedipal dynamics analysis"
echo "   • Dream work mechanisms (condensation, displacement, symbolization)"
echo "   • Childhood connections and family dynamics"
echo "   • Penetrating questions that probe the unconscious"
echo ""
echo "🔥 The absurd becomes meaningful through psychoanalytic lens!" 