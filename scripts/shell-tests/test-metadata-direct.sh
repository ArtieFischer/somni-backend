#!/bin/bash

# Direct test of OpenRouter metadata generation
# This script tests the new batched LLM call directly via OpenRouter API

# Load OpenRouter API key from environment or use default
OPENROUTER_API_KEY="${OPENROUTER_API_KEY:-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}"

# OpenRouter API endpoint
API_URL="https://openrouter.ai/api/v1/chat/completions"

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Output file
OUTPUT_FILE="$(dirname "$0")/test-metadata-direct-output.txt"
echo "Dream Metadata Direct OpenRouter Test Results" > "$OUTPUT_FILE"
echo "=============================================" >> "$OUTPUT_FILE"
echo "Test run at: $(date)" >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"

# Load a safer, shorter appendix (neutral/positive words only)
APPENDIX='air,angel,animal,apple,baby,bag,ball,balloon,beach,bed,bell,bicycle,bird,blanket,boat,book,bottle,box,boy,bread,bridge,brother,bubble,building,butterfly,button,cake,camera,candle,car,card,carpet,castle,cat,chair,cheese,child,circle,city,clock,cloud,coat,coin,color,compass,computer,corner,country,cup,dance,daughter,dawn,day,diamond,doctor,dog,doll,dolphin,door,dragon,dream,dress,drum,duck,eagle,ear,earth,echo,egg,elephant,eye,face,family,farm,father,feather,field,finger,fire,fish,flag,flight,floor,flower,food,foot,forest,fountain,fox,friend,frog,fruit,game,garden,gate,gift,girl,glass,glove,gold,ground,guest,hair,hall,hammer,hand,harbor,hat,head,heart,hero,hill,home,honey,horse,hospital,hotel,hour,house,ice,island,jewel,journey,key,king,kiss,kitchen,kite,knight,ladder,lake,lamp,land,leaf,letter,library,light,line,lion,lock,machine,magic,man,map,market,mask,meadow,medicine,memory,message,metal,milk,mirror,mist,money,moon,morning,mother,mountain,mouse,mouth,music,name,nature,neck,needle,neighbor,nest,net,news,night,nose,note,number,nurse,nut,oak,ocean,office,oil,orange,owl,package,page,paint,palace,palm,paper,parade,paradise,parent,park,party,path,pattern,peace,peak,pearl,pen,pencil,people,perfume,person,pet,phone,photograph,piano,picture,pillow,pilot,pine,place,plain,plan,plane,planet,plant,plate,playground,pocket,poem,pond,pool,portrait,pot,power,present,prince,princess,puzzle,pyramid,queen,quest,question,rabbit,race,radio,raft,rain,rainbow,ray,recipe,record,restaurant,reward,ribbon,rice,riddle,ring,river,road,robe,robot,rock,rocket,roof,room,root,rope,rose,ruler,sage,sail,sailor,salt,sand,satellite,scale,scene,school,screen,scroll,sea,search,season,seat,secret,seed,shadow,shape,sheep,sheet,shelf,shell,shelter,shield,ship,shirt,shoe,shop,shore,shoulder,sign,silk,silver,singer,sister,skin,sky,sleep,smoke,snow,son,song,soul,sound,soup,space,spark,speech,spell,sphere,spider,spiral,spirit,spoon,spring,square,staff,stage,stair,star,station,statue,steam,steel,step,stick,stone,storm,story,stranger,stream,street,string,student,subway,sugar,suit,summer,sun,sunrise,sunset,swan,symbol,table,tail,tailor,teacher,telephone,telescope,temple,tent,test,thing,thread,throne,thunder,ticket,tide,tiger,time,tongue,tool,tooth,torch,tower,town,toy,track,trade,train,treasure,tree,tribe,trick,trophy,truck,trumpet,trunk,truth,tunnel,turkey,turn,turtle,twilight,twin,umbrella,uncle,uniform,universe,vacation,valley,vase,vehicle,veil,vessel,victory,village,vine,violin,vision,visitor,voice,voyage,wall,wand,watch,water,waterfall,wave,weather,web,wedding,well,whale,wheat,wheel,whisper,wife,wind,window,wine,wing,winter,wire,wisdom,wish,witness,wizard,wolf,woman,wood,word,work,world,yard,year,youth,zebra,zero,zone,zoo'

# Function to shuffle appendix using pure bash
shuffle_appendix() {
  # Convert comma-separated string to array
  IFS=',' read -ra arr <<< "$APPENDIX"
  local n=${#arr[@]}
  
  # Fisher-Yates shuffle
  for ((i=n-1; i>0; i--)); do
    j=$((RANDOM % (i + 1)))
    temp="${arr[i]}"
    arr[i]="${arr[j]}"
    arr[j]="$temp"
  done
  
  # Join back to comma-separated string
  local IFS=','
  echo "${arr[*]}"
}

# Test dreams from test-controversial-dreams.sh
declare -a test_dreams=(
  "I was in my bedroom with this girl from college, Sarah. We started kissing passionately and then she began undressing me. I could feel her hands all over my body. We moved to the bed and she was on top of me, moving rhythmically. I woke up feeling aroused and confused because I have a girlfriend. The dream felt so real and intense."
  
  "I was walking home alone at night when someone grabbed me from behind. I tried to scream but no sound came out. They dragged me into an alley and I felt completely powerless and terrified. I couldn't move or fight back. I woke up in a cold sweat, heart pounding. This nightmare has been recurring and it feels so vivid and frightening."
  
  "I was at a party with my boyfriend when I started flirting heavily with his best friend, Marcus. My boyfriend went to get drinks and Marcus and I snuck into a bedroom. We started making out passionately and I felt this intense attraction and excitement. Even though I love my boyfriend, I couldn't stop myself. We almost had sex but then I heard my boyfriend calling my name. I felt guilty but also thrilled by the forbidden nature of it."
  
  "I was at my office doing my usual tasks. I sat at my desk typing emails and attending meetings. My boss came by to discuss a project deadline. Everything was very mundane and ordinary, just like a typical workday. I remember feeling slightly bored and checking the clock frequently, waiting for 5 PM to arrive."
  
  "I was ice skating on this huge, beautiful frozen lake with my sister. The winter landscape was breathtaking - snow-covered pine trees everywhere and the clearest blue sky. We were laughing and gliding effortlessly across the ice, doing spins and racing each other. The air was crisp and fresh, and I felt so free and joyful. My sister and I were holding hands, skating in perfect harmony together."
  
  "I was trapped inside this enormous, maze-like house and desperately trying to find a way out. Every time I opened a door hoping to find an exit, it was just another closet filled with old clothes and junk. The house seemed to go on forever with endless hallways and rooms. I was getting more and more panicked as I ran from door to door, but they were all just closets. I could hear something chasing me through the house, getting closer, but I couldn't escape."
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
  
  # Note: We don't include the appendix in the prompt to avoid moderation issues
  # The LLM will generate symbols based on the dream content
  
  # Shuffle appendix and take only first 80 symbols to avoid moderation issues
  local shuffled_appendix=$(shuffle_appendix)
  IFS=',' read -ra symbols_arr <<< "$shuffled_appendix"
  local symbol_subset=$(IFS=','; echo "${symbols_arr[*]:0:80}")
  
  echo -e "${YELLOW}Debug - Symbol subset (first 20):${NC}"
  echo "${symbols_arr[*]:0:20}" | tr ' ' '\n' | head -5
  
  # Create a simpler prompt that matches the working individual calls
  local user_prompt="Based on the following dream, provide:
1. A short creative title (4-7 words)
2. A visual scene description (max 30 words, only what can be seen)
3. Select exactly 3-7 symbols that appear in the dream from ONLY this list (do not create new symbols): ${symbol_subset}

Important: For symbols, you MUST choose only from the provided list above. Do not invent new symbols.

Format your response as JSON: {\"title\": \"...\", \"scene\": \"...\", \"symbols\": [\"...\", \"...\"]}

Dream:
${dream_text}"

  # Create request body with just user message (no system prompt)
  # Try different models based on test number for variety
  local model="meta-llama/llama-3.1-8b-instruct:free"
  case $test_number in
    1|2) model="mistralai/mistral-7b-instruct:free" ;;  # Try Mistral for sexual content
    3|4) model="meta-llama/llama-3.1-8b-instruct:free" ;;
    5|6) model="google/gemma-2-9b-it:free" ;;
  esac
  
  echo -e "${YELLOW}Using model: $model${NC}"
  
  local request_body=$(jq -n \
    --arg model "$model" \
    --arg user "$user_prompt" \
    '{
      model: $model,
      messages: [
        {role: "user", content: $user}
      ],
      temperature: 0.7,
      max_tokens: 150
    }')
  
  # Make the API call
  echo -e "${YELLOW}Calling API...${NC}"
  response=$(curl -s -X POST "$API_URL" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $OPENROUTER_API_KEY" \
    -H "HTTP-Referer: https://somni.app" \
    -H "X-Title: Somni Dream Analysis" \
    -d "$request_body")
  
  # Check if response is empty
  if [ -z "$response" ]; then
    echo -e "${RED}✗ Empty response from API${NC}"
    echo "Status: FAILED" >> "$OUTPUT_FILE"
    echo "Error: Empty response" >> "$OUTPUT_FILE"
    echo "" >> "$OUTPUT_FILE"
    echo "----------------------------------------" >> "$OUTPUT_FILE"
    echo "" >> "$OUTPUT_FILE"
    return
  fi
  
  # Check if response is valid JSON and extract the content
  if echo "$response" | jq . >/dev/null 2>&1; then
    # Check for error in response first
    if echo "$response" | jq -e '.error' >/dev/null 2>&1; then
      echo -e "${RED}✗ API returned error${NC}"
      echo -e "${YELLOW}Error details:${NC}"
      echo "$response" | jq '.error'
      echo "Status: FAILED" >> "$OUTPUT_FILE"
      echo "Error: API error" >> "$OUTPUT_FILE"
      echo "$response" | jq . >> "$OUTPUT_FILE"
      echo "" >> "$OUTPUT_FILE"
      echo "----------------------------------------" >> "$OUTPUT_FILE"
      echo "" >> "$OUTPUT_FILE"
      return
    fi
    
    # Extract the content from the response
    content=$(echo "$response" | jq -r '.choices[0].message.content // empty')
    
    if [ ! -z "$content" ]; then
      # Debug: show raw content
      echo -e "${YELLOW}Debug - Raw content:${NC}"
      echo "$content" | head -c 200
      echo ""
      
      if echo "$content" | jq . >/dev/null 2>&1; then
        # Parse the metadata from content
        title=$(echo "$content" | jq -r '.title // "N/A"')
        scene=$(echo "$content" | jq -r '.scene // "N/A"')
        symbols=$(echo "$content" | jq -r '.symbols // [] | join(", ")')
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
      symbol_count=$(echo "$content" | jq '.symbols // [] | length')
      if [ "$symbol_count" -ge 3 ] && [ "$symbol_count" -le 7 ]; then
        echo -e "  ${GREEN}✓ Symbol count valid: $symbol_count symbols${NC}"
        echo "Symbol validation: PASS ($symbol_count symbols)" >> "$OUTPUT_FILE"
      else
        echo -e "  ${RED}✗ Symbol count invalid: $symbol_count symbols (expected 3-7)${NC}"
        echo "Symbol validation: FAIL ($symbol_count symbols, expected 3-7)" >> "$OUTPUT_FILE"
      fi
      
      # Save raw response for debugging
      echo "" >> "$OUTPUT_FILE"
      echo "Generated content:" >> "$OUTPUT_FILE"
      echo "$content" | jq . >> "$OUTPUT_FILE"
      else
        echo -e "${RED}✗ Content is not valid JSON${NC}"
        echo -e "  Content: $content"
      fi
    else
      echo -e "${RED}✗ No content in response${NC}"
      echo -e "${YELLOW}Debug - Full response:${NC}"
      echo "$response" | jq . | head -20
      echo "Status: FAILED" >> "$OUTPUT_FILE"
      echo "Error: No content in response" >> "$OUTPUT_FILE"
      echo "Response: $response" >> "$OUTPUT_FILE"
    fi
    
  else
    echo -e "${RED}✗ Failed${NC}"
    echo -e "  Error: Invalid API response"
    echo -e "  Response: $response"
    
    # Write failure to file
    echo "Status: FAILED" >> "$OUTPUT_FILE"
    echo "Error: Invalid API response" >> "$OUTPUT_FILE"
    echo "Raw response: $response" >> "$OUTPUT_FILE"
  fi
  
  echo ""
  echo "" >> "$OUTPUT_FILE"
  echo "----------------------------------------" >> "$OUTPUT_FILE"
  echo "" >> "$OUTPUT_FILE"
}

# Main execution
echo -e "${BLUE}=== Direct OpenRouter Dream Metadata Test ===${NC}"
echo ""

# Check if we have required tools
if ! command -v jq &> /dev/null; then
  echo -e "${RED}Error: jq is required but not installed${NC}"
  echo "Install with: brew install jq"
  exit 1
fi

# Run tests for all dreams
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
echo "- Symbol extraction (3-7 symbols from shuffled appendix subset)"
echo ""
echo -e "${GREEN}Test results saved to: $OUTPUT_FILE${NC}"

# Write summary to file
echo "" >> "$OUTPUT_FILE"
echo "========================================" >> "$OUTPUT_FILE"
echo "TEST SUMMARY" >> "$OUTPUT_FILE"
echo "========================================" >> "$OUTPUT_FILE"
echo "Total tests: ${#test_dreams[@]}" >> "$OUTPUT_FILE"
echo "Test completed at: $(date)" >> "$OUTPUT_FILE"