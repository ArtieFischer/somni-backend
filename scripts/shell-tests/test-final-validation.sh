#!/bin/bash

# Final validation test - Llama 4 with Mistral Nemo fallback
# Tests all dreams and validates symbols against appendix

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Output file
OUTPUT_FILE="$(dirname "$0")/final-validation-output.txt"
echo "Final Model Validation Test Results" > "$OUTPUT_FILE"
echo "===================================" >> "$OUTPUT_FILE"
echo "Test run at: $(date)" >> "$OUTPUT_FILE"
echo "Models: Llama 4 Scout (primary), Mistral Nemo 12B (fallback)" >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"

# Full appendix array
APPENDIX='accident,adult,air,altar,anchor,angel,animal,ant,apartment,apple,arm,arrow,ash,attic,avalanche,baby,bag,ball,balloon,bank,barn,barrier,basement,bat,bath,battle,beach,bear,beast,bed,bee,bell,belt,bench,bicycle,bird,birth,blanket,blood,boat,body,bomb,bone,book,bottle,box,boy,brain,branch,bread,breast,breath,brick,bridge,brother,bubble,building,bull,bullet,bus,butterfly,button,cage,cake,camera,candle,canyon,car,card,carpet,castle,cat,cave,ceiling,cemetery,chain,chair,chase,cheese,chest,child,church,circle,city,cliff,clock,closet,cloud,clown,coat,coffin,coin,collar,color,comet,compass,computer,coral,corner,corpse,corridor,costume,country,court,cow,crack,cradle,crash,creature,crime,cross,crowd,crown,crystal,cup,curtain,dance,darkness,daughter,dawn,death,demon,desert,diamond,dinosaur,disease,doctor,dog,doll,dolphin,door,dragon,dream,dress,drought,drum,duck,dust,eagle,ear,earth,earthquake,echo,eclipse,egg,elder,elephant,elevator,enemy,engine,entrance,escape,evening,explosion,eye,face,factory,fall,family,famine,farm,father,feast,feather,fence,field,fight,finger,fire,fish,flag,flame,flight,flood,floor,flower,fog,food,foot,forest,fountain,fox,friend,frog,fruit,funeral,game,garden,gate,ghost,giant,gift,girl,glass,glove,god,gold,grave,ground,guard,guest,gun,hair,hall,hammer,hand,harbor,hat,head,heart,heaven,hell,hero,hill,hole,home,honey,hook,horn,horse,hospital,hotel,hour,house,hunter,hurricane,husband,ice,idol,infant,insect,invasion,island,jail,jewel,journey,judge,jungle,key,king,kiss,kitchen,kite,knife,knight,knot,labyrinth,ladder,lake,lamp,land,language,lava,leader,leaf,letter,library,light,lightning,line,lion,lock,machine,magic,magician,man,map,market,marriage,mask,maze,meadow,meat,medicine,memory,message,metal,midnight,milk,mine,miracle,mirror,mist,money,monster,moon,morning,mother,mountain,mouse,mouth,mud,murder,music,mystery,nail,name,nation,nature,neck,needle,neighbor,nest,net,news,night,nightmare,noise,noon,nose,note,number,nurse,nut,oak,oasis,ocean,office,oil,oracle,orange,orchard,organ,orphan,owl,ox,package,page,pain,paint,palace,palm,paper,parade,paradise,parent,park,party,passage,passenger,path,patient,pattern,peace,peak,pearl,pen,pencil,people,perfume,person,pet,phone,photograph,piano,picture,pig,pill,pillar,pillow,pilot,pine,pit,place,plain,plan,plane,planet,plant,plate,platform,playground,pocket,poem,poison,pole,police,pond,pool,portal,portrait,pot,powder,power,prayer,present,priest,prince,princess,prison,prize,prophet,puddle,puppet,purse,puzzle,pyramid,queen,quest,question,rabbit,race,radio,raft,rage,rain,rainbow,rat,raven,ray,realm,receipt,recipe,record,refuge,reptile,rescue,restaurant,reward,ribbon,rice,riddle,ring,ritual,river,road,robber,robe,robot,rock,rocket,roof,room,root,rope,rose,ruins,ruler,sacrifice,saddle,sage,sail,sailor,salt,sand,satellite,scale,scar,scene,school,scissors,scorpion,screen,scroll,sea,seal,search,season,seat,secret,seed,serpent,servant,shadow,shape,shark,sheep,sheet,shelf,shell,shelter,shield,ship,shirt,shoe,shop,shore,shoulder,shrine,sibling,sign,silence,silk,silver,singer,sister,skeleton,skin,sky,slave,sleep,smoke,snake,snow,soldier,son,song,soul,sound,soup,space,spark,spear,speech,spell,sphere,spider,spine,spiral,spirit,spoon,spring,square,staff,stage,stair,star,station,statue,steam,steel,step,stick,stone,storm,story,stranger,stream,street,string,student,subway,sugar,suit,summer,sun,sunrise,sunset,swamp,swan,sword,symbol,table,tail,tailor,teacher,tear,telephone,telescope,temple,tent,terror,test,thief,thing,thorn,thread,throne,thunder,ticket,tide,tiger,time,tomb,tongue,tool,tooth,torch,tornado,tower,town,toy,track,trade,train,trap,trash,treasure,tree,trial,tribe,trick,trigger,trophy,trouble,truck,trumpet,trunk,truth,tunnel,turkey,turn,turtle,twilight,twin,umbrella,uncle,uniform,universe,vacation,valley,vampire,vase,vault,vehicle,veil,vein,vessel,victim,victory,village,vine,violin,virgin,vision,visitor,voice,volcano,voyage,vulture,waiter,wall,wand,war,warning,warrior,watch,water,waterfall,wave,weapon,weather,web,wedding,well,whale,wheat,wheel,whip,whisper,wife,wind,window,wine,wing,winter,wire,wisdom,wish,witch,witness,wizard,wolf,woman,wood,word,work,world,worm,wound,wreath,wreck,wrist,writer,yard,year,youth,zebra,zero,zone,zoo'

# Convert appendix to array for validation
IFS=',' read -ra APPENDIX_ARRAY <<< "$APPENDIX"

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

# Function to validate symbols against appendix
validate_symbols() {
  local symbols_json="$1"
  local valid_symbols=()
  local invalid_symbols=()
  
  # Parse JSON array of symbols
  local symbols=$(echo "$symbols_json" | jq -r '.[]')
  
  while IFS= read -r symbol; do
    # Check if symbol exists in appendix
    local found=0
    for appendix_item in "${APPENDIX_ARRAY[@]}"; do
      if [[ "$appendix_item" == "$symbol" ]]; then
        found=1
        valid_symbols+=("$symbol")
        break
      fi
    done
    
    if [[ $found -eq 0 ]]; then
      invalid_symbols+=("$symbol")
    fi
  done <<< "$symbols"
  
  # Return results
  echo "Valid symbols: ${valid_symbols[*]}"
  echo "Invalid/Hallucinated symbols: ${invalid_symbols[*]}"
  echo "Valid count: ${#valid_symbols[@]}"
  echo "Invalid count: ${#invalid_symbols[@]}"
}

# All test dreams - combining controversial and casual dreams
declare -a test_dreams=(
  # Controversial dreams
  "I was in my bedroom with this girl from college, Sarah. We started kissing passionately and then she began undressing me. I could feel her hands all over my body. We moved to the bed and she was on top of me, moving rhythmically. I woke up feeling aroused and confused because I have a girlfriend. The dream felt so real and intense."
  
  "I was walking home alone at night when someone grabbed me from behind. I tried to scream but no sound came out. They dragged me into an alley and I felt completely powerless and terrified. I couldn't move or fight back. I woke up in a cold sweat, heart pounding. This nightmare has been recurring and it feels so vivid and frightening."
  
  "I was in some kind of war zone or horror movie scene. There was blood everywhere - on the walls, pooling on the floor. I saw people being brutally attacked with knives and axes. Body parts were scattered around. I was holding a bloody weapon myself and felt both terrified and strangely powerful. Someone was chasing me through this hellscape. The violence was graphic and disturbing."
  
  "I was at a party with my boyfriend when I started flirting heavily with his best friend, Marcus. My boyfriend went to get drinks and Marcus and I snuck into a bedroom. We started making out passionately and I felt this intense attraction and excitement. Even though I love my boyfriend, I couldn't stop myself. We almost had sex but then I heard my boyfriend calling my name. I felt guilty but also thrilled by the forbidden nature of it."
  
  "I was at my office doing my usual tasks. I sat at my desk typing emails and attending meetings. My boss came by to discuss a project deadline. Everything was very mundane and ordinary, just like a typical workday. I remember feeling slightly bored and checking the clock frequently, waiting for 5 PM to arrive."
  
  "I was ice skating on this huge, beautiful frozen lake with my sister. The winter landscape was breathtaking - snow-covered pine trees everywhere and the clearest blue sky. We were laughing and gliding effortlessly across the ice, doing spins and racing each other. The air was crisp and fresh, and I felt so free and joyful. My sister and I were holding hands, skating in perfect harmony together."
  
  "I was trapped inside this enormous, maze-like house and desperately trying to find a way out. Every time I opened a door hoping to find an exit, it was just another closet filled with old clothes and junk. The house seemed to go on forever with endless hallways and rooms. I was getting more and more panicked as I ran from door to door, but they were all just closets. I could hear something chasing me through the house, getting closer, but I couldn't escape."
  
  # Casual dreams
  "I was back at my parents house, but it was way bigger than I remember. There were all these random animals just running around everywhere - like squirrels, a couple of cats, and this one really fat hamster that kept following me. I was playing with them, having a great time, when I went to the bathroom and looked in the mirror. Thats when I noticed I was losing my hair, like chunks of it just falling out. But weirdly I wasnt that upset about it, just kind of curious. Then my mom called me for dinner and all the animals lined up behind me like we were going to a parade."
  
  "I was at work but instead of desks there were these huge playground slides everywhere. My boss was dressed like a pirate and kept asking me to find his treasure map. I kept sliding down these slides trying to get to my computer, but every time I got close, the slide would take me somewhere else. Then I realized I was wearing my pajamas to this pirate office and everyone was staring at me. But instead of being embarrassed, I just started laughing uncontrollably and slid down the biggest slide which led straight into a ball pit full of office supplies."
  
  "I was back in high school but I was my current age. There was this huge exam I had to take but instead of questions, I had to identify different types of pasta shapes. Everyone else seemed to know exactly what they were doing, writing furiously, while I just sat there staring at pictures of fusilli and penne. Then the teacher, who looked exactly like my third grade teacher Mrs. Johnson, told me I could use my phone to call my mom for help. But when I tried calling, my phone kept turning into different objects - first a banana, then a stapler, then a tiny umbrella. I woke up right as I was about to ask the person next to me if their phone was also a fruit."
  
  "I was driving to meet my friends but my car kept changing into different things while I was driving. First it was my normal car, then suddenly it was a shopping cart, so I had to push myself down the highway. Then it turned into one of those swan boats from the park, so I was pedaling it down the road while cars honked at me. People were waving from their windows like this was totally normal. When I finally got to where I was supposed to meet my friends, they were all there but they were miniature versions of themselves, like action figures. They were yelling up at me that I was late, but I couldnt hear them properly because they were so tiny. I kept trying to pick them up to hear better but they would just run away."
  
  "I was in a cooking competition with Gordon Ramsay, but instead of a kitchen we were in my childhood bedroom. He kept yelling at me about my terrible risotto technique, but I was trying to cook with toy pots and pans from when I was 8. Every time I tried to explain that these werent real cooking utensils, he would just get angrier and start throwing stuffed animals at me. Then my old teddy bear came to life and started giving me cooking advice, but it was all wrong - like telling me to add glitter to the soup and use crayons as seasoning. The weirdest part was that Gordon Ramsay started nodding approvingly at the teddy bears suggestions and said I was finally getting somewhere. I woke up right as I was about to serve him a bowl of crayon soup."
)

declare -a dream_names=(
  "Sexual Dream"
  "Sexual Assault/Trauma Dream"
  "Extreme Violence/Gore Dream"
  "Infidelity/Cheating Dream"
  "Regular Work Day Dream"
  "Fun Skating with Sister Dream"
  "House Escape Nightmare"
  "Family House with Animals"
  "Office Playground Dream"
  "Pasta Exam Dream"
  "Shape-shifting Car Dream"
  "Gordon Ramsay Cooking Dream"
)

# Function to test a single model
test_model() {
  local dream_text="$1"
  local model="$2"
  local test_name="$3"
  
  echo -e "${CYAN}Testing $model${NC}"
  
  # Shuffle appendix for this test
  local shuffled_appendix=$(shuffle_appendix)
  # Take only first 80 symbols to avoid token limits
  IFS=',' read -ra symbols_arr <<< "$shuffled_appendix"
  local symbol_subset=$(IFS=','; echo "${symbols_arr[*]:0:80}")
  
  # Create the prompt
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
${symbol_subset}

### DREAM TRANSCRIPT
${dream_text}"

  # Create request body
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
  
  # Make the API call
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
    
    # Check for moderation
    if echo "$response" | jq -e '.error.metadata.reasons' >/dev/null 2>&1; then
      local reasons=$(echo "$response" | jq -r '.error.metadata.reasons | join(", ")')
      echo "  Moderation flags: $reasons"
      echo "Moderation flags: $reasons" >> "$OUTPUT_FILE"
    fi
    
    return 1  # Return error status
  else
    # Extract content
    local content=$(echo "$response" | jq -r '.choices[0].message.content // empty')
    if [ ! -z "$content" ] && echo "$content" | jq . >/dev/null 2>&1; then
      echo -e "${GREEN}✓ Success${NC}"
      
      # Parse the metadata
      local title=$(echo "$content" | jq -r '.title // "N/A"')
      local scene=$(echo "$content" | jq -r '.scene // "N/A"')
      local symbols=$(echo "$content" | jq -r '.symbols // [] | join(", ")')
      local symbols_array=$(echo "$content" | jq '.symbols // []')
      
      echo "  Title: $title"
      echo "  Scene: $scene"
      echo "  Symbols: $symbols"
      
      # Validate symbols
      echo -e "${YELLOW}  Validating symbols...${NC}"
      local validation_result=$(validate_symbols "$symbols_array")
      echo "  $validation_result"
      
      # Write to file
      echo "Model: $model" >> "$OUTPUT_FILE"
      echo "Status: SUCCESS" >> "$OUTPUT_FILE"
      echo "Title: $title" >> "$OUTPUT_FILE"
      echo "Scene: $scene" >> "$OUTPUT_FILE"
      echo "Symbols: $symbols" >> "$OUTPUT_FILE"
      echo "Symbol Validation:" >> "$OUTPUT_FILE"
      echo "$validation_result" >> "$OUTPUT_FILE"
      echo "Response:" >> "$OUTPUT_FILE"
      echo "$content" | jq . >> "$OUTPUT_FILE"
      
      return 0  # Return success status
    else
      echo -e "${YELLOW}⚠ Unexpected response format${NC}"
      echo "  Response: $content"
      
      echo "Model: $model" >> "$OUTPUT_FILE"
      echo "Status: UNEXPECTED" >> "$OUTPUT_FILE"
      echo "Response: $content" >> "$OUTPUT_FILE"
      
      return 1  # Return error status
    fi
  fi
  
  echo "" >> "$OUTPUT_FILE"
}

# Main execution
echo -e "${BLUE}=== Final Validation Test: Llama 4 + Mistral Nemo ===${NC}"
echo ""

# Test each dream
for i in "${!test_dreams[@]}"; do
  echo -e "${BLUE}Test $((i + 1)): ${dream_names[$i]}${NC}"
  echo "Dream excerpt: ${test_dreams[$i]:0:100}..."
  echo ""
  
  echo "Test $((i + 1)): ${dream_names[$i]}" >> "$OUTPUT_FILE"
  echo "========================================" >> "$OUTPUT_FILE"
  echo "Dream: ${test_dreams[$i]}" >> "$OUTPUT_FILE"
  echo "" >> "$OUTPUT_FILE"
  
  # Try Llama 4 first
  if test_model "${test_dreams[$i]}" "meta-llama/llama-4-scout:free" "Llama 4 Scout"; then
    echo -e "${GREEN}✓ Llama 4 handled successfully${NC}"
  else
    echo -e "${YELLOW}↻ Llama 4 failed, trying Mistral Nemo fallback...${NC}"
    echo ""
    
    # Try Mistral Nemo as fallback
    test_model "${test_dreams[$i]}" "mistralai/mistral-nemo:free" "Mistral Nemo 12B (Fallback)"
  fi
  
  echo "----------------------------------------" >> "$OUTPUT_FILE"
  echo "" >> "$OUTPUT_FILE"
  
  # Delay between dreams
  sleep 2
  echo ""
done

echo -e "${BLUE}=== Summary ===${NC}"
echo "Test complete. Results saved to: $OUTPUT_FILE"
echo ""
echo "Key features:"
echo "- Primary model: Llama 4 Scout"
echo "- Fallback model: Mistral Nemo 12B"
echo "- Symbol validation against appendix"
echo "- Tests both controversial and casual dreams"

# Write summary to file
echo "" >> "$OUTPUT_FILE"
echo "========================================" >> "$OUTPUT_FILE"
echo "SUMMARY" >> "$OUTPUT_FILE"
echo "========================================" >> "$OUTPUT_FILE"
echo "Test completed at: $(date)" >> "$OUTPUT_FILE"
echo "Primary Model: Llama 4 Scout" >> "$OUTPUT_FILE"
echo "Fallback Model: Mistral Nemo 12B" >> "$OUTPUT_FILE"
echo "Dreams tested: ${#test_dreams[@]}" >> "$OUTPUT_FILE"
echo "Features: Symbol validation against appendix" >> "$OUTPUT_FILE"