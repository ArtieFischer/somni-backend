#!/bin/bash

# Test batched metadata generation (title + image prompt)

API_SECRET="39a7294a9bdcc74712658060bfdbaa18442f03ac03f57fcb8bc1eea98e22ee27"
API_URL="http://localhost:3000/api/v1/models/test/metadata"

# Color codes for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== Testing Batched Metadata Generation (Title + Image Prompt) ===${NC}"
echo ""

# Test dreams
declare -a test_dreams=(
  "I was walking through a dark forest at night. The trees were tall and twisted, with branches reaching out like hands. I could hear strange noises coming from the shadows. Suddenly, a bright light appeared in the distance, and I started running towards it. As I got closer, I realized it was a small cottage with smoke coming from the chimney. Inside, I found my grandmother cooking soup, even though she passed away years ago."
  
  "I was flying over a beautiful city made entirely of glass. The buildings sparkled in the sunlight, creating rainbows everywhere. I could control my flight perfectly, soaring between the towers and diving down to street level. People below were waving at me and cheering. I felt completely free and powerful."
  
  "I was back in my childhood home, but everything was underwater. Fish were swimming through the living room, and seaweed was growing on the furniture. I could breathe normally despite being submerged. My family was there, sitting at the dinner table as if nothing was unusual, eating a meal while schools of colorful fish swam around us."
)

declare -a dream_names=(
  "Dark Forest Dream"
  "Glass City Flight"
  "Underwater Home"
)

# Test each dream
for i in "${!test_dreams[@]}"; do
  echo -e "${BLUE}Test $((i + 1)): ${dream_names[$i]}${NC}"
  echo "Dream excerpt: ${test_dreams[$i]:0:80}..."
  echo ""
  
  # Create request body
  REQUEST_BODY=$(jq -n \
    --arg transcript "${test_dreams[$i]}" \
    --arg dreamId "test-$(date +%s)-$i" \
    '{
      transcript: $transcript,
      dreamId: $dreamId
    }')
  
  # Make the API call
  echo -e "${YELLOW}Calling metadata API...${NC}"
  response=$(curl -s -X POST "$API_URL" \
    -H "Content-Type: application/json" \
    -H "X-API-Secret: $API_SECRET" \
    -d "$REQUEST_BODY")
  
  # Check if response is valid
  if echo "$response" | jq . >/dev/null 2>&1; then
    # Extract and display results
    success=$(echo "$response" | jq -r '.success')
    
    if [ "$success" = "true" ]; then
      echo -e "${GREEN}✓ Success${NC}"
      
      # Display metadata
      title=$(echo "$response" | jq -r '.title')
      imagePrompt=$(echo "$response" | jq -r '.imagePrompt')
      model=$(echo "$response" | jq -r '.model')
      
      echo "Model Used: $model"
      echo "Title: $title"
      echo "Image Prompt: $imagePrompt"
      
      # Validate title length
      word_count=$(echo "$title" | wc -w | tr -d ' ')
      if [ "$word_count" -ge 4 ] && [ "$word_count" -le 7 ]; then
        echo -e "${GREEN}✓ Title word count: $word_count (valid)${NC}"
      else
        echo -e "${RED}✗ Title word count: $word_count (expected 4-7)${NC}"
      fi
      
      # Validate image prompt length
      prompt_word_count=$(echo "$imagePrompt" | wc -w | tr -d ' ')
      if [ "$prompt_word_count" -le 30 ]; then
        echo -e "${GREEN}✓ Image prompt word count: $prompt_word_count (valid)${NC}"
      else
        echo -e "${RED}✗ Image prompt word count: $prompt_word_count (max 30)${NC}"
      fi
      
      # Display token usage
      echo ""
      echo "Token Usage:"
      echo "$response" | jq -r '.usage | "  Prompt tokens: \(.promptTokens)\n  Completion tokens: \(.completionTokens)\n  Total tokens: \(.totalTokens)"'
      
    else
      echo -e "${RED}✗ Failed${NC}"
      echo "Error: $(echo "$response" | jq -r '.error')"
    fi
  else
    echo -e "${RED}✗ Invalid response${NC}"
    echo "$response"
  fi
  
  echo ""
  echo "----------------------------------------"
  echo ""
  
  # Delay between requests
  sleep 1
done

echo -e "${BLUE}=== Summary ===${NC}"
echo "Batched metadata generation test complete"
echo "This single call replaces:"
echo "  1. generateDreamTitle()"
echo "  2. generateDreamSceneDescription()"
echo ""
echo "Benefits:"
echo "  - Reduced API calls from 2 to 1"
echo "  - Lower latency"
echo "  - Consistent context for both title and image prompt"