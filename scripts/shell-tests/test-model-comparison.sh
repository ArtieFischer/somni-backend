#!/bin/bash

# Model comparison test - Mistral vs Llama 4
# Tests the same dreams with both models side by side

# API configuration
API_SECRET="39a7294a9bdcc74712658060bfdbaa18442f03ac03f57fcb8bc1eea98e22ee27"
API_URL="http://localhost:3000"

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Output file
OUTPUT_FILE="$(dirname "$0")/model-comparison-output.txt"
echo "Model Comparison Test Results" > "$OUTPUT_FILE"
echo "=============================" >> "$OUTPUT_FILE"
echo "Test run at: $(date)" >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"

# Load appendix symbols
APPENDIX='accident,adult,air,altar,anchor,angel,animal,ant,apartment,apple,arm,arrow,ash,attic,avalanche,baby,bag,ball,balloon,bank,barn,barrier,basement,bat,bath,battle,beach,bear,beast,bed,bee,bell,belt,bench,bicycle,bird,birth,blanket,blood,boat,body,bomb,bone,book,bottle,box,boy,brain,branch,bread,breast,breath,brick,bridge,brother,bubble,building,bull,bullet,bus,butterfly,button,cage,cake,camera,candle,canyon,car,card,carpet,castle,cat,cave,ceiling,cemetery,chain,chair,chase,cheese,chest,child,church,circle,city,cliff,clock,closet,cloud,clown,coat,coffin,coin,collar,color,comet,compass,computer,coral,corner,corpse,corridor,costume,country,court,cow,crack,cradle,crash,creature,crime,cross,crowd,crown,crystal,cup,curtain,dance,darkness,daughter,dawn,death,demon,desert,diamond,dinosaur,disease,doctor,dog,doll,dolphin,door,dragon,dream,dress,drought,drum,duck,dust,eagle,ear,earth,earthquake,echo,eclipse,egg,elder,elephant,elevator,enemy,engine,entrance,escape,evening,explosion,eye,face,factory,fall,family,famine,farm,father,feast,feather,fence,field,fight,finger,fire,fish,flag,flame,flight,flood,floor,flower,fog,food,foot,forest,fountain,fox,friend,frog,fruit,funeral,game,garden,gate,ghost,giant,gift,girl,glass,glove,god,gold,grave,ground,guard,guest,gun,hair,hall,hammer,hand,harbor,hat,head,heart,heaven,hell,hero,hill,hole,home,honey,hook,horn,horse,hospital,hotel,hour,house,hunter,hurricane,husband,ice,idol,infant,insect,invasion,island,jail,jewel,journey,judge,jungle,key,king,kiss,kitchen,kite,knife,knight,knot,labyrinth,ladder,lake,lamp,land,language,lava,leader,leaf,letter,library,light,lightning,line,lion,lock,machine,magic,magician,man,map,market,marriage,mask,maze,meadow,meat,medicine,memory,message,metal,midnight,milk,mine,miracle,mirror,mist,money,monster,moon,morning,mother,mountain,mouse,mouth,mud,murder,music,mystery,nail,name,nation,nature,neck,needle,neighbor,nest,net,news,night,nightmare,noise,noon,nose,note,number,nurse,nut,oak,oasis,ocean,office,oil,oracle,orange,orchard,organ,orphan,owl,ox,package,page,pain,paint,palace,palm,paper,parade,paradise,parent,park,party,passage,passenger,path,patient,pattern,peace,peak,pearl,pen,pencil,people,perfume,person,pet,phone,photograph,piano,picture,pig,pill,pillar,pillow,pilot,pine,pit,place,plain,plan,plane,planet,plant,plate,platform,playground,pocket,poem,poison,pole,police,pond,pool,portal,portrait,pot,powder,power,prayer,present,priest,prince,princess,prison,prize,prophet,puddle,puppet,purse,puzzle,pyramid,queen,quest,question,rabbit,race,radio,raft,rage,rain,rainbow,rat,raven,ray,realm,receipt,recipe,record,refuge,reptile,rescue,restaurant,reward,ribbon,rice,riddle,ring,ritual,river,road,robber,robe,robot,rock,rocket,roof,room,root,rope,rose,ruins,ruler,sacrifice,saddle,sage,sail,sailor,salt,sand,satellite,scale,scar,scene,school,scissors,scorpion,screen,scroll,sea,seal,search,season,seat,secret,seed,serpent,servant,shadow,shape,shark,sheep,sheet,shelf,shell,shelter,shield,ship,shirt,shoe,shop,shore,shoulder,shrine,sibling,sign,silence,silk,silver,singer,sister,skeleton,skin,sky,slave,sleep,smoke,snake,snow,soldier,son,song,soul,sound,soup,space,spark,spear,speech,spell,sphere,spider,spine,spiral,spirit,spoon,spring,square,staff,stage,stair,star,station,statue,steam,steel,step,stick,stone,storm,story,stranger,stream,street,string,student,subway,sugar,suit,summer,sun,sunrise,sunset,swamp,swan,sword,symbol,table,tail,tailor,teacher,tear,telephone,telescope,temple,tent,terror,test,thief,thing,thorn,thread,throne,thunder,ticket,tide,tiger,time,tomb,tongue,tool,tooth,torch,tornado,tower,town,toy,track,trade,train,trap,trash,treasure,tree,trial,tribe,trick,trigger,trophy,trouble,truck,trumpet,trunk,truth,tunnel,turkey,turn,turtle,twilight,twin,umbrella,uncle,uniform,universe,vacation,valley,vampire,vase,vault,vehicle,veil,vein,vessel,victim,victory,village,vine,violin,virgin,vision,visitor,voice,volcano,voyage,vulture,waiter,wall,wand,war,warning,warrior,watch,water,waterfall,wave,weapon,weather,web,wedding,well,whale,wheat,wheel,whip,whisper,wife,wind,window,wine,wing,winter,wire,wisdom,wish,witch,witness,wizard,wolf,woman,wood,word,work,world,worm,wound,wreath,wreck,wrist,writer,yard,year,youth,zebra,zero,zone,zoo'

# Function to shuffle appendix
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

# Test dreams from controversial test suite
declare -a test_dreams=(
  "I was in my bedroom with this girl from college, Sarah. We started kissing passionately and then she began undressing me. I could feel her hands all over my body. We moved to the bed and she was on top of me, moving rhythmically. I woke up feeling aroused and confused because I have a girlfriend. The dream felt so real and intense."
  
  "I was walking home alone at night when someone grabbed me from behind. I tried to scream but no sound came out. They dragged me into an alley and I felt completely powerless and terrified. I couldn't move or fight back. I woke up in a cold sweat, heart pounding. This nightmare has been recurring and it feels so vivid and frightening."
  
  "I was in some kind of war zone or horror movie scene. There was blood everywhere - on the walls, pooling on the floor. I saw people being brutally attacked with knives and axes. Body parts were scattered around. I was holding a bloody weapon myself and felt both terrified and strangely powerful. Someone was chasing me through this hellscape. The violence was graphic and disturbing."
  
  "I was at a party with my boyfriend when I started flirting heavily with his best friend, Marcus. My boyfriend went to get drinks and Marcus and I snuck into a bedroom. We started making out passionately and I felt this intense attraction and excitement. Even though I love my boyfriend, I couldn't stop myself. We almost had sex but then I heard my boyfriend calling my name. I felt guilty but also thrilled by the forbidden nature of it."
  
  "I was at my office doing my usual tasks. I sat at my desk typing emails and attending meetings. My boss came by to discuss a project deadline. Everything was very mundane and ordinary, just like a typical workday. I remember feeling slightly bored and checking the clock frequently, waiting for 5 PM to arrive."
  
  "I was ice skating on this huge, beautiful frozen lake with my sister. The winter landscape was breathtaking - snow-covered pine trees everywhere and the clearest blue sky. We were laughing and gliding effortlessly across the ice, doing spins and racing each other. The air was crisp and fresh, and I felt so free and joyful. My sister and I were holding hands, skating in perfect harmony together."
  
  "I was trapped inside this enormous, maze-like house and desperately trying to find a way out. Every time I opened a door hoping to find an exit, it was just another closet filled with old clothes and junk. The house seemed to go on forever with endless hallways and rooms. I was getting more and more panicked as I ran from door to door, but they were all just closets. I could hear something chasing me through the house, getting closer, but I couldn't escape."
)

declare -a dream_names=(
  "Sexual Dream"
  "Sexual Assault/Trauma Dream"
  "Extreme Violence/Gore Dream"
  "Infidelity/Cheating Dream"
  "Regular Work Day Dream"
  "Fun Skating with Sister Dream"
  "House Escape Nightmare"
)

# Function to test a single model
test_model() {
  local dream_text="$1"
  local model="$2"
  local test_name="$3"
  
  echo -e "${CYAN}Testing $model${NC}"
  
  # Shuffle appendix for this test
  local shuffled_appendix=$(shuffle_appendix)
  
  # Create the original prompt format with context
  local system_prompt="You are DREAM-METADATA v1. Work strictly in English.
Return a single-line minified JSON. No additional keys.
Context: You are analyzing dream descriptions submitted by users seeking psychological help and self-improvement."

  local user_prompt="### TASKS
1. \"title\": 4-7 words, evocative, no punctuation at the end.
2. \"scene\": ≤ 30 words. Create a single visual scene that illustrates the dream. Focus only on what can be seen - colors, objects, environment, lighting. Pure visual description, present tense.
3. \"symbols\": 5-10 generic nouns from APPENDIX that appear in or relate to the dream. If nothing matches, invent a *new* generic noun (lowercase).

### RULES
• Each field is independent – do not let wording of one influence another.
• Use only information from the FULL transcript below.
• For scene: Be specific with visual details - textures, colors, lighting, atmosphere. No feelings or interpretations.
• Output **exactly** this JSON schema: {\"title\":\"…\",\"scene\":\"…\",\"symbols\":[\"…\",\"…\"]}

### APPENDIX (allowed nouns, lowercase)
${shuffled_appendix}

### DREAM TRANSCRIPT
${dream_text}"

  # Create request body with response_format
  local request_body=$(jq -n \
    --arg model "$model" \
    --arg system "$system_prompt" \
    --arg user "$user_prompt" \
    '{
      model: $model,
      messages: [
        {role: "system", content: $system},
        {role: "user", content: $user}
      ],
      response_format: { type: "json_object" },
      max_tokens: 200,
      temperature: 0.9
    }')
  
  # Make the API call via OpenRouter
  local response=$(curl -s -X POST "https://openrouter.ai/api/v1/chat/completions" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer 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" \
    -H "HTTP-Referer: https://somni.app" \
    -H "X-Title: Somni Dream Analysis" \
    -d "$request_body")
  
  # Process response
  if echo "$response" | jq -e '.error' >/dev/null 2>&1; then
    echo -e "${RED}✗ Error${NC}"
    local error_msg=$(echo "$response" | jq -r '.error.message // "Unknown error"')
    local error_code=$(echo "$response" | jq -r '.error.code // "N/A"')
    echo "  Error: $error_msg (Code: $error_code)"
    
    # Write to file
    echo "Model: $model" >> "$OUTPUT_FILE"
    echo "Status: ERROR" >> "$OUTPUT_FILE"
    echo "Error: $error_msg (Code: $error_code)" >> "$OUTPUT_FILE"
    
    # Check for moderation details
    if echo "$response" | jq -e '.error.metadata.reasons' >/dev/null 2>&1; then
      local reasons=$(echo "$response" | jq -r '.error.metadata.reasons | join(", ")')
      echo "  Moderation flags: $reasons"
      echo "Moderation flags: $reasons" >> "$OUTPUT_FILE"
    fi
    
    # Check for prompt training requirement
    if [[ "$error_msg" == *"Enable prompt training"* ]]; then
      echo "  Note: This model requires enabling prompt training in OpenRouter settings"
      echo "Note: Model requires prompt training enabled" >> "$OUTPUT_FILE"
    fi
  else
    # Extract content
    local content=$(echo "$response" | jq -r '.choices[0].message.content // empty')
    if [ ! -z "$content" ] && echo "$content" | jq . >/dev/null 2>&1; then
      echo -e "${GREEN}✓ Success${NC}"
      
      # Parse the metadata
      local title=$(echo "$content" | jq -r '.title // "N/A"')
      local scene=$(echo "$content" | jq -r '.scene // "N/A"')
      local symbols=$(echo "$content" | jq -r '.symbols // [] | join(", ")')
      
      echo "  Title: $title"
      echo "  Scene: $scene"
      echo "  Symbols: $symbols"
      
      # Count symbols
      local symbol_count=$(echo "$content" | jq '.symbols // [] | length')
      if [ "$symbol_count" -ge 5 ] && [ "$symbol_count" -le 10 ]; then
        echo -e "  ${GREEN}✓ Symbol count valid: $symbol_count${NC}"
      else
        echo -e "  ${YELLOW}⚠ Symbol count: $symbol_count (expected 5-10)${NC}"
      fi
      
      # Write to file
      echo "Model: $model" >> "$OUTPUT_FILE"
      echo "Status: SUCCESS" >> "$OUTPUT_FILE"
      echo "Title: $title" >> "$OUTPUT_FILE"
      echo "Scene: $scene" >> "$OUTPUT_FILE"
      echo "Symbols: $symbols" >> "$OUTPUT_FILE"
      echo "Symbol count: $symbol_count" >> "$OUTPUT_FILE"
      echo "Response:" >> "$OUTPUT_FILE"
      echo "$content" | jq . >> "$OUTPUT_FILE"
    else
      echo -e "${YELLOW}⚠ Unexpected response format${NC}"
      echo "  Response: $content"
      
      echo "Model: $model" >> "$OUTPUT_FILE"
      echo "Status: UNEXPECTED" >> "$OUTPUT_FILE"
      echo "Response: $content" >> "$OUTPUT_FILE"
    fi
  fi
  
  echo "" >> "$OUTPUT_FILE"
  echo ""
}

# Main execution
echo -e "${BLUE}=== Model Comparison: Mistral vs Llama 4 vs DeepSeek ===${NC}"
echo ""

# Test each dream with all three models
for i in "${!test_dreams[@]}"; do
  echo -e "${BLUE}Test $((i + 1)): ${dream_names[$i]}${NC}"
  echo "Dream excerpt: ${test_dreams[$i]:0:100}..."
  echo ""
  
  echo "Test $((i + 1)): ${dream_names[$i]}" >> "$OUTPUT_FILE"
  echo "========================================" >> "$OUTPUT_FILE"
  echo "Dream: ${test_dreams[$i]}" >> "$OUTPUT_FILE"
  echo "" >> "$OUTPUT_FILE"
  
  # Test with Mistral models
  test_model "${test_dreams[$i]}" "mistralai/mistral-7b-instruct:free" "Mistral 7B"
  
  echo "" # Space between models
  
  test_model "${test_dreams[$i]}" "mistralai/mistral-nemo:free" "Mistral Nemo 12B"
  
  echo "" # Space between models
  
  test_model "${test_dreams[$i]}" "cognitivecomputations/dolphin3.0-mistral-24b:free" "Dolphin3.0 Mistral 24B"
  
  echo "" # Space between models
  
  # Test with Llama 4
  test_model "${test_dreams[$i]}" "meta-llama/llama-4-scout:free" "Llama 4 Scout"
  
  echo "" # Space between models
  
  # Test with Gemma 2
  test_model "${test_dreams[$i]}" "google/gemma-2-9b-it:free" "Gemma 2 9B"
  
  echo "----------------------------------------" >> "$OUTPUT_FILE"
  echo "" >> "$OUTPUT_FILE"
  
  # Delay between dreams
  sleep 2
done

echo -e "${BLUE}=== Summary ===${NC}"
echo "Comparison complete. Results saved to: $OUTPUT_FILE"
echo ""
echo "Key differences to look for:"
echo "- Moderation/censorship behavior"
echo "- Quality of titles and scenes"
echo "- Symbol selection (5-10 from appendix)"
echo "- Handling of sensitive content"

# Write summary to file
echo "" >> "$OUTPUT_FILE"
echo "========================================" >> "$OUTPUT_FILE"
echo "SUMMARY" >> "$OUTPUT_FILE"
echo "========================================" >> "$OUTPUT_FILE"
echo "Test completed at: $(date)" >> "$OUTPUT_FILE"
echo "Models tested: Mistral 7B, Mistral Nemo 12B, Dolphin3.0 Mistral 24B, Llama 4 Scout, Gemma 2 9B" >> "$OUTPUT_FILE"
echo "Dreams tested: ${#test_dreams[@]}" >> "$OUTPUT_FILE"