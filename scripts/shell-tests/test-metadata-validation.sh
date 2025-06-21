#!/bin/bash

# Quick test of metadata generation with symbol validation

API_SECRET="39a7294a9bdcc74712658060bfdbaa18442f03ac03f57fcb8bc1eea98e22ee27"
API_URL="http://localhost:3000/api/v1/models/test/metadata"

# Color codes for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== Testing Metadata Generation with Symbol Validation ===${NC}"
echo ""

# Test dream
DREAM="I was walking through a dark forest at night. The trees were tall and twisted, with branches reaching out like hands. I could hear strange noises coming from the shadows. Suddenly, a bright light appeared in the distance, and I started running towards it. As I got closer, I realized it was a small cottage with smoke coming from the chimney. Inside, I found my grandmother cooking soup, even though she passed away years ago."

# Create request body
REQUEST_BODY=$(jq -n \
  --arg transcript "$DREAM" \
  --arg dreamId "test-$(date +%s)" \
  '{
    transcript: $transcript,
    dreamId: $dreamId
  }')

echo "Testing dream excerpt: ${DREAM:0:100}..."
echo ""

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
    echo ""
    
    # Display metadata
    title=$(echo "$response" | jq -r '.title')
    scene=$(echo "$response" | jq -r '.scene')
    model=$(echo "$response" | jq -r '.model')
    
    echo "Model Used: $model"
    echo "Title: $title"
    echo "Scene: $scene"
    echo ""
    
    # Display symbols
    echo "Original Symbols:"
    echo "$response" | jq -r '.symbols[]' | while read symbol; do
      echo "  - $symbol"
    done
    echo ""
    
    echo "Validated Symbols (from appendix):"
    echo "$response" | jq -r '.validatedSymbols[]' | while read symbol; do
      echo "  - $symbol"
    done
    echo ""
    
    # Display validation stats
    echo "Symbol Validation Statistics:"
    echo "$response" | jq -r '.symbolValidation | "  Total symbols: \(.totalSymbols)\n  Valid symbols: \(.validSymbols)\n  Invalid symbols: \(.invalidSymbols)\n  Validation rate: \(.validationRate)"'
    
    if [ $(echo "$response" | jq -r '.symbolValidation.invalidSymbols') -gt 0 ]; then
      echo ""
      echo "Invalid/Hallucinated Symbols:"
      echo "$response" | jq -r '.symbolValidation.invalidSymbolsList[]' | while read symbol; do
        echo "  - $symbol"
      done
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
echo -e "${BLUE}=== Test Complete ===${NC}"