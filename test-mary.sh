#!/bin/bash

# Test script for Mary (neuroscientist) interpreter
# Tests various dream scenarios to verify Mary's interpretation style

echo "Testing Mary (Neuroscientist) Dream Interpreter"
echo "=============================================="
echo ""

# Base URL
BASE_URL="http://localhost:3456/api"

# Test 1: Memory and learning dream
echo "Test 1: Memory and Learning Dream"
echo "---------------------------------"
curl -s -X POST "${BASE_URL}/interpretation" \
  -H "Content-Type: application/json" \
  -d '{
    "dreamTranscription": "I was in a library where books were flying off the shelves and reorganizing themselves. Each time I tried to read one, the words would rearrange into new patterns. I felt like my brain was literally rewiring itself.",
    "interpreterType": "mary",
    "analysisDepth": "deep",
    "userContext": {
      "age": 25,
      "emotionalState": "mentally exhausted",
      "currentLifeSituation": "Studying for medical boards"
    }
  }' | jq -r '.interpretation' || echo "Request failed"

echo -e "\n\n"

# Test 2: Sleep quality dream
echo "Test 2: Sleep Quality Dream"
echo "---------------------------"
curl -s -X POST "${BASE_URL}/interpretation" \
  -H "Content-Type: application/json" \
  -d '{
    "dreamTranscription": "I kept waking up within my dream, each time thinking I was finally awake, only to realize I was still dreaming. Clocks showed impossible times and I felt trapped in layers of sleep.",
    "interpreterType": "mary",
    "analysisDepth": "deep",
    "userContext": {
      "age": 38,
      "emotionalState": "exhausted and frustrated",
      "currentLifeSituation": "Dealing with chronic insomnia",
      "recentMajorEvents": ["New baby at home", "Work deadline stress"]
    }
  }' | jq -r '.interpretation' || echo "Request failed"

echo -e "\n\n"

# Test 3: Creative problem-solving dream
echo "Test 3: Creative Problem-Solving Dream"
echo "--------------------------------------"
curl -s -X POST "${BASE_URL}/interpretation" \
  -H "Content-Type: application/json" \
  -d '{
    "dreamTranscription": "I was painting with colors that don'\''t exist in waking life. Each brushstroke created mathematical equations that solved themselves. I woke up with a solution to a problem I'\''ve been working on for weeks.",
    "interpreterType": "mary",
    "analysisDepth": "transformative",
    "userContext": {
      "age": 42,
      "emotionalState": "creatively inspired",
      "currentLifeSituation": "Working on innovative research project"
    }
  }' | jq -r '.interpretation' || echo "Request failed"

echo -e "\n\n"

# Test 4: Emotional processing dream
echo "Test 4: Emotional Processing Dream"
echo "----------------------------------"
curl -s -X POST "${BASE_URL}/interpretation" \
  -H "Content-Type: application/json" \
  -d '{
    "dreamTranscription": "I was swimming through an ocean of tears that gradually turned into laughter. The water was warm and healing. I could breathe underwater and felt all my sadness dissolving.",
    "interpreterType": "mary",
    "analysisDepth": "deep",
    "userContext": {
      "age": 29,
      "emotionalState": "processing grief",
      "recentMajorEvents": ["Loss of loved one", "Starting therapy"]
    }
  }' | jq -r '.interpretation' || echo "Request failed"

echo -e "\n\n"

# Test 5: Lucid awareness dream
echo "Test 5: Lucid Awareness Dream"
echo "-----------------------------"
curl -s -X POST "${BASE_URL}/interpretation" \
  -H "Content-Type: application/json" \
  -d '{
    "dreamTranscription": "I suddenly realized I was dreaming and could control everything. I experimented with changing the scenery, flying, and even having conversations with my subconscious mind, which appeared as a wise owl.",
    "interpreterType": "mary",
    "analysisDepth": "transformative",
    "userContext": {
      "age": 34,
      "emotionalState": "curious and empowered",
      "currentLifeSituation": "Practicing lucid dreaming techniques"
    }
  }' | jq -r '.interpretation' || echo "Request failed"

echo -e "\n\nAll Mary tests completed!"