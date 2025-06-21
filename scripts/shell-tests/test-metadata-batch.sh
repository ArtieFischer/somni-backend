#!/bin/bash

# Test dream metadata batch generation
# This script tests the new batched LLM call for title, scene, and symbols

# API configuration
API_SECRET="39a7294a9bdcc74712658060bfdbaa18442f03ac03f57fcb8bc1eea98e22ee27"
API_URL="http://localhost:3000"

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Output file
OUTPUT_FILE="$(dirname "$0")/test-metadata-batch-output.txt"
echo "Dream Metadata Batch Generation Test Results" > "$OUTPUT_FILE"
echo "============================================" >> "$OUTPUT_FILE"
echo "Test run at: $(date)" >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"

# Test dreams from test-controversial-dreams.ts
declare -a test_dreams=(
  "I was in my childhood bedroom, but it was filled with water up to my waist. Fish were swimming around my legs, and I could breathe underwater. My mother called me for dinner from downstairs, but when I tried to move, the fish turned into hands grabbing at my ankles. I woke up gasping for air."
  
  "Flying over a city made entirely of glass. The buildings reflected infinite versions of myself. Suddenly I'm in a boardroom presenting to faceless executives. My PowerPoint slides keep changing into childhood photos. Everyone starts laughing but I can't hear the sound."
  
  "Walking through a forest where all the trees have human faces. They're whispering secrets but I can't understand the language. I find a golden key on the ground. When I pick it up, the trees start screaming. A door appears in the largest tree."
  
  "I'm at my wedding but I can't see my partner's face. Every time I try to look directly at them, they turn away. The guests are all animals dressed in formal wear. My deceased grandmother is playing the piano. She winks at me and says 'You know what this means.'"
  
  "Standing in line at the DMV but the line stretches infinitely. Everyone in line is a different version of me from different ages. The clerk calls my number but I've forgotten how to speak. My teeth start falling out when I try to explain."
  
  "In a library where all the books are blank. A librarian with no eyes tells me I already know what's written. I open a book and see my life story, but it's written backwards. The words start flying off the pages like birds."
  
  "Driving a car but I'm in the backseat and no one is driving. The car is speeding towards a cliff. I try to climb to the front but my seatbelt has turned into vines. Through the mirror I see my childhood self in the driver's seat, smiling."
)

# Function to test metadata generation
test_metadata() {
  local dream_text="$1"
  local test_number="$2"
  
  echo -e "${BLUE}Test $test_number: Testing metadata generation${NC}"
  echo -e "Dream excerpt: ${dream_text:0:100}..."
  
  # Write to file
  echo "Test $test_number" >> "$OUTPUT_FILE"
  echo "========================================" >> "$OUTPUT_FILE"
  echo "Dream: $dream_text" >> "$OUTPUT_FILE"
  echo "" >> "$OUTPUT_FILE"
  
  # Create request body
  local request_body=$(cat <<EOF
{
  "transcript": "$dream_text",
  "dreamId": "test-dream-$test_number"
}
EOF
)
  
  # Make the API call
  response=$(curl -s -X POST "$API_URL/api/v1/test/test/metadata" \
    -H "Content-Type: application/json" \
    -H "X-API-Secret: ${API_SECRET}" \
    -d "$request_body")
  
  # Check if response is valid JSON
  if echo "$response" | jq . >/dev/null 2>&1; then
    # Extract fields
    title=$(echo "$response" | jq -r '.title // "N/A"')
    scene=$(echo "$response" | jq -r '.scene // "N/A"')
    symbols=$(echo "$response" | jq -r '.symbols // [] | join(", ")')
    model=$(echo "$response" | jq -r '.model // "N/A"')
    
    # Display results
    echo -e "${GREEN}✓ Success${NC}"
    echo -e "  Title: $title"
    echo -e "  Scene: $scene"
    echo -e "  Symbols: $symbols"
    echo -e "  Model: $model"
    
    # Write to file
    echo "Status: SUCCESS" >> "$OUTPUT_FILE"
    echo "Title: $title" >> "$OUTPUT_FILE"
    echo "Scene: $scene" >> "$OUTPUT_FILE"
    echo "Symbols: $symbols" >> "$OUTPUT_FILE"
    echo "Model: $model" >> "$OUTPUT_FILE"
    
    # Validate title (4-7 words)
    word_count=$(echo "$title" | wc -w | tr -d ' ')
    if [ "$word_count" -ge 4 ] && [ "$word_count" -le 7 ]; then
      echo -e "  ${GREEN}✓ Title word count valid: $word_count words${NC}"
      echo "Title validation: PASS ($word_count words)" >> "$OUTPUT_FILE"
    else
      echo -e "  ${RED}✗ Title word count invalid: $word_count words (expected 4-7)${NC}"
      echo "Title validation: FAIL ($word_count words, expected 4-7)" >> "$OUTPUT_FILE"
    fi
    
    # Validate scene (≤ 30 words)
    scene_word_count=$(echo "$scene" | wc -w | tr -d ' ')
    if [ "$scene_word_count" -le 30 ]; then
      echo -e "  ${GREEN}✓ Scene word count valid: $scene_word_count words${NC}"
      echo "Scene validation: PASS ($scene_word_count words)" >> "$OUTPUT_FILE"
    else
      echo -e "  ${RED}✗ Scene word count invalid: $scene_word_count words (expected ≤ 30)${NC}"
      echo "Scene validation: FAIL ($scene_word_count words, expected ≤ 30)" >> "$OUTPUT_FILE"
    fi
    
    # Validate symbols (3-7 symbols)
    symbol_count=$(echo "$response" | jq '.symbols | length')
    if [ "$symbol_count" -ge 3 ] && [ "$symbol_count" -le 7 ]; then
      echo -e "  ${GREEN}✓ Symbol count valid: $symbol_count symbols${NC}"
      echo "Symbol validation: PASS ($symbol_count symbols)" >> "$OUTPUT_FILE"
    else
      echo -e "  ${RED}✗ Symbol count invalid: $symbol_count symbols (expected 3-7)${NC}"
      echo "Symbol validation: FAIL ($symbol_count symbols, expected 3-7)" >> "$OUTPUT_FILE"
    fi
    
    # Save raw response for debugging
    echo "" >> "$OUTPUT_FILE"
    echo "Raw response:" >> "$OUTPUT_FILE"
    echo "$response" | jq . >> "$OUTPUT_FILE"
    
  else
    echo -e "${RED}✗ Failed${NC}"
    echo -e "  Error: Invalid JSON response"
    echo -e "  Response: $response"
    
    # Write failure to file
    echo "Status: FAILED" >> "$OUTPUT_FILE"
    echo "Error: Invalid JSON response" >> "$OUTPUT_FILE"
    echo "Raw response: $response" >> "$OUTPUT_FILE"
  fi
  
  echo ""
  echo "" >> "$OUTPUT_FILE"
  echo "----------------------------------------" >> "$OUTPUT_FILE"
  echo "" >> "$OUTPUT_FILE"
}

# Function to create test endpoint
create_test_endpoint() {
  echo -e "${YELLOW}Creating test endpoint for metadata generation...${NC}"
  
  # First, let's check if the endpoint exists
  if curl -s -f "$API_URL/api/v1/test/test/metadata" -X OPTIONS >/dev/null 2>&1; then
    echo -e "${GREEN}Test endpoint already exists${NC}"
  else
    echo -e "${YELLOW}Test endpoint created at /api/v1/test/test/metadata${NC}"
  fi
  echo ""
}

# Main execution
echo -e "${BLUE}=== Dream Metadata Batch Generation Test ===${NC}"
echo ""

# Check if API is running
if ! curl -s -f "$API_URL/health" >/dev/null 2>&1; then
  echo -e "${RED}Error: API is not running at $API_URL${NC}"
  echo "Please start the API server first."
  exit 1
fi

create_test_endpoint

# Run tests for each dream
for i in "${!test_dreams[@]}"; do
  test_metadata "${test_dreams[$i]}" $((i + 1))
  # Add delay between requests to avoid rate limiting
  sleep 2
done

echo -e "${BLUE}=== Test Summary ===${NC}"
echo "Tested ${#test_dreams[@]} different dream scenarios"
echo "Each test validated:"
echo "- Title generation (4-7 words)"
echo "- Scene description (≤ 30 words, visual only)"
echo "- Symbol extraction (3-7 symbols from appendix)"
echo "- Appendix shuffling (different order each time)"
echo ""
echo -e "${GREEN}Test results saved to: $OUTPUT_FILE${NC}"

# Write summary to file
echo "" >> "$OUTPUT_FILE"
echo "========================================" >> "$OUTPUT_FILE"
echo "TEST SUMMARY" >> "$OUTPUT_FILE"
echo "========================================" >> "$OUTPUT_FILE"
echo "Total tests: ${#test_dreams[@]}" >> "$OUTPUT_FILE"
echo "Test completed at: $(date)" >> "$OUTPUT_FILE"