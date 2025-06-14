#!/bin/bash

echo "🔍 Capturing Raw AI Response Format using curl..."
echo

dream_content="I found myself flying over a vast, deep blue ocean. The water was so clear I could see all the way to the bottom, where ancient ruins of a sunken city lay covered in golden light. As I flew, I felt both incredibly free and terrified of falling."

echo "📝 Dream Content: ${dream_content:0:100}..."
echo "🎯 Interpreter: Jungian"
echo "🧪 Analysis Depth: initial"
echo

start_time=$(date +%s%3N)

response=$(curl -s -X POST "http://localhost:3000/api/v1/interpretation/test/interpret" \
  -H "X-API-Secret: 39a7294a9bdcc74712658060bfdbaa18442f03ac03f57fcb8bc1eea98e22ee27" \
  -H "Content-Type: application/json" \
  -d "{
    \"dreamId\": \"$(uuidgen)\",
    \"dreamTranscription\": \"${dream_content}\",
    \"interpreterType\": \"jung\",
    \"analysisDepth\": \"initial\",
    \"userContext\": {
      \"age\": 35,
      \"currentLifeSituation\": \"Career transition\"
    }
  }")

end_time=$(date +%s%3N)
duration=$((end_time - start_time))

echo "⏱️  Response in ${duration}ms"

# Check if response is valid JSON
if echo "$response" | jq empty 2>/dev/null; then
  echo "📊 Status: SUCCESS"
  echo "✅ Valid JSON response received!"
  echo
  
  # Extract and display the raw AI response
  echo "🤖 RAW AI RESPONSE (first 2000 chars):"
  echo "=================================================="
  ai_response=$(echo "$response" | jq -r '.aiResponse // empty')
  
  if [ -n "$ai_response" ]; then
    echo "$ai_response" | head -c 2000
    echo
    echo "=================================================="
    echo "📏 Total Response Length: $(echo "$ai_response" | wc -c) chars"
    echo
    
    # Show last part if it's long
    if [ $(echo "$ai_response" | wc -c) -gt 2000 ]; then
      echo "🤖 RAW AI RESPONSE (last 1000 chars):"
      echo "=================================================="
      echo "$ai_response" | tail -c 1000
      echo "=================================================="
    fi
    
    echo
    echo "🧠 PARSED RESULT:"
    echo "=================================================="
    echo "$response" | jq '.interpretation' | head -50
    echo "=================================================="
    
  else
    echo "❌ No aiResponse found in response"
    echo "Full response:"
    echo "$response" | jq '.'
  fi
else
  echo "❌ ERROR: Invalid JSON or error response"
  echo "Response:"
  echo "$response"
fi 