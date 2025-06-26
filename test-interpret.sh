#!/bin/bash

echo "Testing dream interpretation endpoint..."

curl -X POST http://localhost:3000/api/v1/dreams/interpret \
  -H "Content-Type: application/json" \
  -d '{
    "dreamId": "test-dream-001",
    "dreamTranscription": "I was in my childhood home, but it looked different - the walls were glass and I could see the ocean outside. My mother was there, but she was younger, maybe in her 30s. She was trying to tell me something important, but her words came out as colorful bubbles that floated away before I could read them.",
    "interpreterType": "jung",
    "themes": [
      {
        "code": "family",
        "name": "Family",
        "relevanceScore": 0.9
      },
      {
        "code": "communication",
        "name": "Communication",
        "relevanceScore": 0.8
      },
      {
        "code": "transformation",
        "name": "Transformation",
        "relevanceScore": 0.7
      }
    ],
    "userContext": {
      "age": 35,
      "currentLifeSituation": "Going through career transition",
      "emotionalState": "Contemplative"
    }
  }' | jq .