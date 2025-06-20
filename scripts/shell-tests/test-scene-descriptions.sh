#!/bin/bash

# 🎨 Scene Description Generation Test
# Generates scene descriptions for all controversial dreams
# Usage: ./test-scene-descriptions.sh

API_SECRET="39a7294a9bdcc74712658060bfdbaa18442f03ac03f57fcb8bc1eea98e22ee27"
BASE_URL="http://localhost:3000/api/v1/scene-description"
OUTPUT_FILE="scene-descriptions-$(date +%Y%m%d_%H%M%S).txt"

# Define all controversial dreams (same as in test-controversial-dreams.sh)
declare -A DREAMS
declare -A DREAM_NAMES

# Controversial/edge case dreams
DREAMS[1]="I was in my bedroom with this girl from college, Sarah. We started kissing passionately and then she began undressing me. I could feel her hands all over my body. We moved to the bed and she was on top of me, moving rhythmically. I woke up feeling aroused and confused because I have a girlfriend. The dream felt so real and intense."
DREAM_NAMES[1]="Sexual Dream"

DREAMS[2]="I was walking home alone at night when someone grabbed me from behind. I tried to scream but no sound came out. They dragged me into an alley and I felt completely powerless and terrified. I couldn't move or fight back. I woke up in a cold sweat, heart pounding. This nightmare has been recurring and it feels so vivid and frightening."
DREAM_NAMES[2]="Sexual Assault/Trauma Dream"

DREAMS[3]="I was in some kind of war zone or horror movie scene. There was blood everywhere - on the walls, pooling on the floor. I saw people being brutally attacked with knives and axes. Body parts were scattered around. I was holding a bloody weapon myself and felt both terrified and strangely powerful. Someone was chasing me through this hellscape. The violence was graphic and disturbing."
DREAM_NAMES[3]="Extreme Violence/Gore Dream"

DREAMS[4]="I was at a party with my boyfriend when I started flirting heavily with his best friend, Marcus. My boyfriend went to get drinks and Marcus and I snuck into a bedroom. We started making out passionately and I felt this intense attraction and excitement. Even though I love my boyfriend, I couldn't stop myself. We almost had sex but then I heard my boyfriend calling my name. I felt guilty but also thrilled by the forbidden nature of it."
DREAM_NAMES[4]="Infidelity/Cheating Dream"

DREAMS[5]="I was at my office doing my usual tasks. I sat at my desk typing emails and attending meetings. My boss came by to discuss a project deadline. Everything was very mundane and ordinary, just like a typical workday. I remember feeling slightly bored and checking the clock frequently, waiting for 5 PM to arrive."
DREAM_NAMES[5]="Regular Work Day Dream"

DREAMS[6]="I was ice skating on this huge, beautiful frozen lake with my sister. The winter landscape was breathtaking - snow-covered pine trees everywhere and the clearest blue sky. We were laughing and gliding effortlessly across the ice, doing spins and racing each other. The air was crisp and fresh, and I felt so free and joyful. My sister and I were holding hands, skating in perfect harmony together."
DREAM_NAMES[6]="Fun Skating with Sister Dream"

DREAMS[7]="I was trapped inside this enormous, maze-like house and desperately trying to find a way out. Every time I opened a door hoping to find an exit, it was just another closet filled with old clothes and junk. The house seemed to go on forever with endless hallways and rooms. I was getting more and more panicked as I ran from door to door, but they were all just closets. I could hear something chasing me through the house, getting closer, but I couldn't escape."
DREAM_NAMES[7]="House Escape Nightmare"

# Start output file
echo "🎨 SCENE DESCRIPTION GENERATION TEST" > "$OUTPUT_FILE"
echo "===================================" >> "$OUTPUT_FILE"
echo "Generated on: $(date)" >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"

# Also display to console
echo "🎨 SCENE DESCRIPTION GENERATION TEST"
echo "==================================="
echo "Generating scene descriptions for ${#DREAMS[@]} dreams..."
echo "Output will be saved to: $OUTPUT_FILE"
echo ""

# Test each dream
for i in {1..7}; do
    echo "🌙 Dream $i: ${DREAM_NAMES[$i]}" | tee -a "$OUTPUT_FILE"
    echo "=================================================" | tee -a "$OUTPUT_FILE"
    echo "" | tee -a "$OUTPUT_FILE"
    
    echo "Original Dream:" | tee -a "$OUTPUT_FILE"
    echo "${DREAMS[$i]}" | tee -a "$OUTPUT_FILE"
    echo "" | tee -a "$OUTPUT_FILE"
    
    echo "Scene Description:" | tee -a "$OUTPUT_FILE"
    
    # Make API call to generate scene description
    RESPONSE=$(curl -s -X POST "$BASE_URL" \
      -H "Content-Type: application/json" \
      -H "X-API-Secret: $API_SECRET" \
      -d "{
        \"dreamTranscription\": \"${DREAMS[$i]}\"
      }" \
      --max-time 30)
    
    # Extract scene description from response
    if [ $? -eq 0 ]; then
        SCENE_DESC=$(echo "$RESPONSE" | jq -r '.sceneDescription // .error // "Failed to generate"')
        echo "$SCENE_DESC" | tee -a "$OUTPUT_FILE"
    else
        echo "Error: Failed to connect to API" | tee -a "$OUTPUT_FILE"
    fi
    
    echo "" | tee -a "$OUTPUT_FILE"
    echo "" | tee -a "$OUTPUT_FILE"
    
    # Small delay between requests
    sleep 1
done

echo "✅ Scene description generation completed!" | tee -a "$OUTPUT_FILE"
echo "==========================================" | tee -a "$OUTPUT_FILE"
echo "" | tee -a "$OUTPUT_FILE"
echo "📋 Results saved to: $OUTPUT_FILE" | tee -a "$OUTPUT_FILE"

# Make script executable
chmod +x "$0"