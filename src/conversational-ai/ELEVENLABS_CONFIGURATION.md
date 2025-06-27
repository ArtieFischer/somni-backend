# ElevenLabs Configuration Guide

## Understanding the Architecture

### Two Configuration Approaches

#### 1. **Pre-configured Agents (Current Implementation)**
The current implementation uses pre-configured agents created in the ElevenLabs dashboard:

```typescript
// Agent IDs reference pre-configured agents
ELEVENLABS_AGENT_ID_JUNG=agent_abc123
ELEVENLABS_AGENT_ID_LAKSHMI=agent_def456
```

**Pros:**
- Simple to implement
- Voice, LLM, and prompts configured in one place
- Easy to test and modify without code changes

**Cons:**
- Requires manual dashboard configuration
- Less dynamic control from code
- Need separate agents for each interpreter

#### 2. **Dynamic Agent Creation (Advanced)**
For more control, you can create agents dynamically:

```typescript
// Example of dynamic agent creation (not implemented)
const agentConfig = {
  name: "Jung Dream Interpreter",
  voice: {
    provider: "elevenlabs",
    voice_id: "21m00Tcm4TlvDq8ikWAM", // Rachel voice
    settings: {
      stability: 0.8,
      similarity_boost: 0.75
    }
  },
  llm: {
    provider: "openai",
    model: "gpt-4-turbo",
    temperature: 0.8,
    max_tokens: 500
  },
  prompt: jungSystemPrompt
};
```

## Setting Up Pre-configured Agents

### Step 1: Create Agent in ElevenLabs Dashboard

1. Log into [ElevenLabs Dashboard](https://elevenlabs.io)
2. Navigate to **Conversational AI → Agents**
3. Click **Create Agent**

### Step 2: Configure Voice

For each interpreter, select appropriate voices:

#### Jung Agent
- **Voice suggestions**: Daniel, Adam, Antoni
- **Characteristics**: Mature, thoughtful, analytical
- **Settings**:
  - Stability: 0.8 (consistent tone)
  - Clarity + Similarity: 0.75 (natural but clear)

#### Lakshmi Agent  
- **Voice suggestions**: Rachel, Bella, Elli
- **Characteristics**: Warm, spiritual, compassionate
- **Settings**:
  - Stability: 0.85 (very consistent)
  - Clarity + Similarity: 0.7 (more natural)

#### Freud Agent (Future)
- **Voice suggestions**: Arnold, Clyde, George
- **Characteristics**: Authoritative, classical, European accent
- **Settings**:
  - Stability: 0.9 (very stable)
  - Clarity + Similarity: 0.8 (clear pronunciation)

#### Mary Agent (Future)
- **Voice suggestions**: Charlotte, Dorothy, Nicole
- **Characteristics**: Gentle, nurturing, supportive
- **Settings**:
  - Stability: 0.85
  - Clarity + Similarity: 0.65 (very natural)

### Step 3: Configure LLM

Choose based on your needs:

#### For Best Quality (Higher Cost)
- **Model**: Claude 3.5 Sonnet or GPT-4
- **Use for**: Production, paying customers
- **Settings**:
  - Temperature: 0.8 (creative but focused)
  - Max tokens: 500-800 (conversational length)

#### For Fast Response (Lower Cost)
- **Model**: Gemini 1.5 Flash or GPT-4o-mini
- **Use for**: Development, testing, free tier
- **Settings**:
  - Temperature: 0.7
  - Max tokens: 300-500

### Step 4: Set System Prompts

Copy the system prompts from the interpreter personalities:

```typescript
// From jung-conversational.agent.ts
const jungSystemPrompt = `You are ${this.personality.name}, ${this.personality.description}.
${this.personality.voiceSignature}

[Include full personality context...]`;
```

### Step 5: Configure Agent Settings

1. **First Message**: Set from conversation starters
2. **Language**: English (or multi-language if needed)
3. **Tools**: Enable if you need external API calls
4. **Pronunciation**: Add custom pronunciations for psychological terms

## Testing Your Configuration

### 1. Get Agent ID
After creating the agent, copy the agent ID from the dashboard.

### 2. Update Environment Variables
```bash
ELEVENLABS_AGENT_ID_JUNG=your_new_agent_id
```

### 3. Test Connection
```bash
# Use the testing guide to verify connection
node test-websocket.js
```

## Advanced Configuration Options

### Custom Pronunciation Dictionary
For psychological/spiritual terms:

```json
{
  "Jung": "yoong",
  "anima": "AN-ih-mah",
  "individuation": "in-div-id-you-AY-shun",
  "chakra": "CHAH-krah",
  "dharma": "DAR-mah"
}
```

### Voice Cloning Option
For unique interpreter voices:
1. Record 30+ minutes of voice samples
2. Upload to ElevenLabs Voice Lab
3. Create custom voice
4. Use in agent configuration

### Multi-language Support
Configure additional languages:
1. Enable in agent settings
2. Add language-specific voices
3. Update prompts with language detection

## Troubleshooting

### "Agent not found" Error
- Verify agent ID is correct
- Check agent is published/active
- Ensure API key has access

### Voice Sounds Robotic
- Adjust stability (lower = more expressive)
- Check voice selection matches personality
- Verify audio format compatibility

### LLM Responses Too Long/Short
- Adjust max_tokens in agent settings
- Modify system prompt for brevity/detail
- Check conversation mode prompts

## Future Enhancements

### 1. Dynamic Voice Selection
```typescript
// Potential implementation
interface VoiceConfig {
  interpreterId: string;
  voiceId: string;
  voiceSettings: {
    stability: number;
    similarityBoost: number;
  };
}

// Allow runtime voice switching
async switchVoice(voiceConfig: VoiceConfig) {
  // Implementation to change voice mid-conversation
}
```

### 2. Model Selection API
```typescript
// Allow dynamic model selection
async setLLMModel(model: string, settings: any) {
  this.elevenLabsService.updateAgentConfig({
    llm: { model, ...settings }
  });
}
```

### 3. Voice Emotion Control
```typescript
// Adjust voice emotion based on content
async setVoiceEmotion(emotion: 'neutral' | 'empathetic' | 'encouraging') {
  // Adjust voice parameters dynamically
}
```

## Best Practices

1. **Test voices extensively** before production
2. **Monitor usage costs** - voice AI can be expensive
3. **Have fallback options** - text-only mode for errors
4. **Record sample conversations** for quality assurance
5. **Get user feedback** on voice preferences
6. **Consider regional accents** for global users