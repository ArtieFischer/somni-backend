# Conversational AI MVP Implementation

## Overview
This document tracks the implementation of the Conversational AI feature for Somni, building on top of the existing dream interpretation infrastructure. The MVP focuses on enabling real-time conversations with the 4 interpreter personas using ElevenLabs' conversational AI API.

## MVP Scope (1-Day Implementation)

### What's Included in MVP
1. **Basic ElevenLabs WebSocket Integration**
   - Simple WebSocket connection to ElevenLabs
   - Audio streaming capability
   - Basic error handling

2. **Minimal Agent System**
   - Extend existing interpreter base class
   - Support for Jung and Lakshmi initially
   - Basic prompt templates

3. **Simple WebSocket Server**
   - Socket.IO integration
   - JWT authentication
   - Basic connection handling

4. **Core API Endpoints**
   - Start conversation
   - End conversation
   - Get conversation history

5. **Dream Context Integration**
   - Pass interpretation data to conversation
   - Include relevant knowledge fragments

### What's Deferred to Later

#### Phase 2 Features (Week 2)
- [ ] Redis caching for conversation state
- [ ] Message queue (Bull/BullMQ) for async processing
- [ ] Conversation summaries
- [ ] Audio file storage and CDN
- [ ] Advanced error recovery (circuit breakers)
- [ ] Rate limiting per user
- [ ] Freud and Mary interpreter agents

#### Phase 3 Features (Week 3-4)
- [ ] Analytics and monitoring
- [ ] Advanced prompt engineering system
- [ ] User profile integration
- [ ] Conversation branching
- [ ] Multi-language support
- [ ] Voice customization per user
- [ ] Conversation export features

#### Production Features (Week 5-6)
- [ ] Horizontal scaling support
- [ ] Advanced security (prompt injection prevention)
- [ ] A/B testing framework
- [ ] Cost optimization strategies
- [ ] Backup conversation providers
- [ ] Advanced WebSocket reconnection logic
- [ ] Conversation sentiment analysis

## Architecture Decisions

### 1. Reuse Existing Patterns
We're extending the modular interpreter system rather than creating a new architecture:
```typescript
// Conversational agents extend the existing interpreter pattern
ConversationalAgent extends BaseInterpreter
```

### 2. Minimal External Dependencies
- Use existing Socket.IO (already in package.json)
- ElevenLabs SDK for WebSocket handling
- No Redis/Bull in MVP (use in-memory state)

### 3. Database Schema
Using existing tables with minimal additions:
```sql
-- conversations table already exists
-- messages table already exists
-- Just need to add elevenlabs_session_id to conversations
```

### 4. Stateless Design
MVP uses stateless design to avoid complexity:
- Conversation state reconstructed from DB on each request
- No persistent WebSocket connections between requests
- Simple JWT-based auth

## Implementation Guide

### Step 1: ElevenLabs Service Setup ✅
```typescript
// src/conversational-ai/services/elevenlabs.service.ts
// - WebSocket client with event emitter pattern
// - Audio streaming with chunk management
// - Basic reconnection logic
// - Error handling and state management
```

### Step 2: Base Conversational Agent ✅
```typescript
// src/conversational-ai/agents/base/base-conversational-agent.ts
// - Extends existing BaseInterpreter for consistency
// - Reuses personality definitions from interpreters
// - Conversation-specific prompt building
// - Integration with ElevenLabs service
```

### Step 3: Agent Implementations ✅
```typescript
// src/conversational-ai/agents/jung-conversational.agent.ts
// src/conversational-ai/agents/lakshmi-conversational.agent.ts
// - Import and reuse existing interpreter personalities
// - Maintain voice consistency with interpretation
// - Personality-specific conversation handling
// - Technical term limits (4 per response)
```

### Step 4: WebSocket Server ✅
```typescript
// src/conversational-ai/websocket/websocket.server.ts
// - Socket.IO with JWT authentication
// - Event-driven architecture
// - Audio and text input support
// - Agent lifecycle management
```

### Step 5: API Controller ✅
```typescript
// src/conversational-ai/api/conversation.controller.ts
// - POST /conversations/start
// - POST /conversations/:id/end
// - GET /conversations/:id/history
// - GET /conversations/:id/context
// - GET /conversations (user's conversations)
```

### Step 6: Integration Services ✅
```typescript
// src/conversational-ai/services/conversation.service.ts
// - Conversation CRUD operations
// - Message storage and retrieval
// - Statistics tracking

// src/conversational-ai/services/conversation-context.service.ts
// - Reuses existing interpretation data structures
// - Extracts relevant knowledge from interpretations
// - Builds comprehensive conversation context
```

## Code Structure

```
src/conversational-ai/
├── CONVERSATIONAL_AI_MVP_IMPLEMENTATION.md (this file)
├── services/
│   ├── elevenlabs.service.ts
│   ├── conversation-context.service.ts
│   └── conversation.service.ts
├── agents/
│   ├── base/
│   │   └── base-conversational-agent.ts
│   ├── jung-conversational.agent.ts
│   └── lakshmi-conversational.agent.ts
├── websocket/
│   ├── websocket.server.ts
│   └── handlers/
│       └── conversation.handler.ts
├── api/
│   └── conversation.controller.ts
├── types/
│   ├── conversation.types.ts
│   └── elevenlabs.types.ts
└── prompts/
    ├── jung.prompts.ts
    └── lakshmi.prompts.ts
```

## Environment Variables

```bash
# Add to .env
ELEVENLABS_API_KEY=your_api_key_here  # Only needed for private agents
ELEVENLABS_AGENT_ID_JUNG=agent_id_for_jung  # Public agent ID for Jung
ELEVENLABS_AGENT_ID_LAKSHMI=agent_id_for_lakshmi  # Public agent ID for Lakshmi

# Note: For MVP, using public agents which don't require API key authentication
# For production with private agents, implement signed URL generation
```

## API Endpoints

### Start Conversation
```typescript
POST /api/conversations/start
{
  "dreamId": "uuid",
  "interpreterId": "jung" | "lakshmi",
  "userId": "uuid"
}

Response:
{
  "conversationId": "uuid",
  "websocketUrl": "wss://...",
  "token": "jwt_token"
}
```

### End Conversation
```typescript
POST /api/conversations/:id/end

Response:
{
  "success": true,
  "duration": 180, // seconds
  "messageCount": 10
}
```

### Get History
```typescript
GET /api/conversations/:id/history

Response:
{
  "messages": [...],
  "interpretation": {...},
  "duration": 180
}
```

## WebSocket Events

### Client -> Server (Our Socket.IO Server)
```typescript
// Audio chunk
socket.emit('audio_chunk', { chunk: ArrayBuffer })

// Text input (fallback)
socket.emit('text_input', { text: string })

// End conversation
socket.emit('end_conversation')
```

### Server -> Client (Our Socket.IO Server)
```typescript
// Audio response
socket.on('audio_response', { chunk: ArrayBuffer })

// Transcription
socket.on('transcription', { text: string, speaker: 'user' | 'agent', isFinal: boolean })

// Agent text response
socket.on('agent_response', { text: string, isTentative: boolean })

// Voice activity detection
socket.on('vad_score', { score: number })

// Conversation metadata
socket.on('conversation_metadata', { conversationId: string, audioFormat: string })

// Error
socket.on('error', { code: string, message: string })
```

### ElevenLabs WebSocket Protocol (Internal)
```typescript
// Connection URL
wss://api.elevenlabs.io/v1/convai/conversation?agent_id={agent_id}

// Client to ElevenLabs
{
  "user_audio_chunk": "base64EncodedAudioData=="
}

{
  "type": "conversation_initiation_client_data",
  "conversation_config_override": {
    "agent": {
      "prompt": { "prompt": "system prompt here" },
      "first_message": "greeting message",
      "language": "en"
    }
  }
}

// ElevenLabs to Client
{
  "type": "conversation_initiation_metadata",
  "conversation_initiation_metadata_event": {
    "conversation_id": "conv_123",
    "agent_output_audio_format": "pcm_16000"
  }
}

{
  "type": "user_transcript",
  "user_transcription_event": {
    "user_transcript": "user's speech"
  }
}

{
  "type": "agent_response",
  "agent_response_event": {
    "agent_response": "agent's text response",
    "is_tentative": false
  }
}
```

## Potential Pitfalls

### 1. WebSocket Connection Issues
**Problem**: Connections drop frequently, especially on mobile
**MVP Solution**: Basic reconnection on client side
**Future**: Implement exponential backoff, connection state recovery

### 2. Audio Streaming Latency
**Problem**: Delays in audio processing cause poor UX
**MVP Solution**: Use default ElevenLabs settings
**Future**: Optimize chunk sizes, implement buffering strategies

### 3. Token Limit Exceeded
**Problem**: Long conversations hit context limits
**MVP Solution**: Limit conversation to 10 minutes
**Future**: Implement sliding window, conversation summaries

### 4. Cost Management
**Problem**: ElevenLabs API costs can escalate
**MVP Solution**: Hard limit of 10 min per conversation
**Future**: User quotas, usage tracking, cost alerts

### 5. Security Concerns
**Problem**: Prompt injection, unauthorized access
**MVP Solution**: Basic JWT auth, input length limits
**Future**: Advanced sanitization, rate limiting, audit logs

## Testing Strategy

### MVP Testing (Manual)
1. Test WebSocket connection establishment
2. Verify audio streaming works
3. Check conversation context includes interpretation
4. Test error scenarios (connection drop, timeout)

### Future Automated Testing
- [ ] Unit tests for agents and services
- [ ] Integration tests for WebSocket flows
- [ ] Load testing for concurrent conversations
- [ ] Security testing for prompt injection

## Deployment Considerations

### MVP Deployment
- Single server deployment
- In-memory state (no Redis needed)
- Basic monitoring with console logs

### Future Production Deployment
- [ ] Kubernetes deployment with horizontal scaling
- [ ] Redis cluster for distributed state
- [ ] CDN for audio files
- [ ] Advanced monitoring with Datadog/NewRelic
- [ ] Auto-scaling based on WebSocket connections

## Migration Path

The MVP is designed to be easily extended:

1. **State Management**: In-memory → Redis
2. **Message Processing**: Synchronous → Queue-based
3. **Error Handling**: Basic try-catch → Circuit breakers
4. **Monitoring**: Console logs → Structured logging
5. **Scaling**: Single server → Distributed system

## Success Metrics

### MVP Metrics
- Successful conversation establishment
- Audio streaming without major delays
- Interpretation context properly included
- Basic error recovery works

### Future Metrics
- Audio latency < 500ms
- 99% uptime
- Support 100+ concurrent conversations
- User satisfaction > 4.5/5
- Cost per conversation < $0.50

## Integration with Existing Dream Interpretation Module

### Reused Components
1. **Personality Definitions**: All agents import and extend existing interpreter classes
2. **Voice Signatures**: Maintain consistent personality across interpretation and conversation
3. **Prompt Patterns**: Adapted three-stage prompt structure for conversations
4. **Type Definitions**: Using existing DreamInterpretation and extended types
5. **Language Patterns**: Technical term limits and characteristic vocabulary

### Key Integration Points
```typescript
// Conversational agents extend existing interpreters
import { JungDreamInterpreter } from '../dream-interpretation/interpreters/jung/jung-interpreter';

// Reuse interpretation data structures
import { DreamInterpretation } from '../dream-interpretation/types/extended';

// Extract knowledge from existing interpretations
const relevantKnowledge = interpretation.fullResponse.stageMetadata.relevanceAssessment.relevantFragments;
```

## Next Steps After MVP

1. **Week 2**: 
   - Add Redis for conversation state caching
   - Implement Bull/BullMQ for async processing
   - Add Freud and Mary conversational agents
   - Implement conversation summaries

2. **Week 3**: 
   - Advanced prompt engineering system
   - User profile integration
   - Conversation branching
   - Multi-language support

3. **Week 4**: 
   - Analytics and monitoring (OpenTelemetry)
   - Security hardening (prompt injection prevention)
   - A/B testing framework
   - Advanced error recovery

4. **Week 5**: 
   - Performance optimization
   - Horizontal scaling support
   - Cost optimization strategies
   - CDN integration for audio

5. **Week 6**: 
   - Production deployment guides
   - Comprehensive documentation
   - Load testing
   - Disaster recovery planning

## Frontend Integration Guide

### Architecture Overview
```
Mobile App <--WebSocket--> Backend (Socket.IO) <--WebSocket--> ElevenLabs
```

### Connection Flow

1. **Start Conversation** (REST API)
```typescript
// Frontend
const response = await fetch('/api/conversations/start', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${authToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    dreamId: 'dream-uuid',
    interpreterId: 'jung' // or 'lakshmi'
  })
});

const { conversationId, websocketUrl, token } = await response.json();
```

2. **Connect to WebSocket**
```typescript
// Frontend WebSocket connection
import { io } from 'socket.io-client';

const socket = io(websocketUrl, {
  auth: { token },
  query: { conversationId }
});

// Connection events
socket.on('connect', () => {
  console.log('Connected to conversation');
});

socket.on('conversation_started', (data) => {
  console.log('Agent greeting:', data.message);
  setAgentMessage(data.message);
});
```

3. **Audio Streaming**
```typescript
// Frontend audio recording (React Native example)
import { Audio } from 'expo-av';

// Start recording
const recording = new Audio.Recording();
await recording.prepareToRecordAsync({
  android: {
    extension: '.m4a',
    outputFormat: Audio.RECORDING_OPTION_ANDROID_OUTPUT_FORMAT_MPEG_4,
    audioEncoder: Audio.RECORDING_OPTION_ANDROID_AUDIO_ENCODER_AAC,
    sampleRate: 16000, // ElevenLabs prefers 16kHz
  },
  ios: {
    extension: '.m4a',
    outputFormat: Audio.RECORDING_OPTION_IOS_OUTPUT_FORMAT_MPEG4AAC,
    audioQuality: Audio.RECORDING_OPTION_IOS_AUDIO_QUALITY_HIGH,
    sampleRate: 16000,
  },
});

await recording.startAsync();

// Send audio chunks periodically or on stop
const uri = recording.getURI();
const audioData = await fetch(uri).then(r => r.arrayBuffer());
socket.emit('audio_chunk', { chunk: audioData });
```

4. **Receive Responses**
```typescript
// Text responses (immediate feedback)
socket.on('transcription', (data) => {
  if (data.speaker === 'user') {
    // Show what the user said
    setUserTranscript(data.text);
  }
});

socket.on('agent_response', (data) => {
  // Show agent's text response
  setAgentText(data.text);
  setIsAgentThinking(!data.isTentative);
});

// Audio responses
socket.on('audio_response', async (data) => {
  // Play agent's audio
  const sound = new Audio.Sound();
  const audioBuffer = data.chunk; // ArrayBuffer
  
  // Convert ArrayBuffer to playable format
  await sound.loadAsync({ 
    uri: `data:audio/pcm;base64,${btoa(String.fromCharCode(...new Uint8Array(audioBuffer)))}`
  });
  await sound.playAsync();
});

// Voice Activity Detection
socket.on('vad_score', (data) => {
  // Update UI to show if user is speaking
  setIsSpeaking(data.score > 0.5);
});
```

5. **Text Fallback** (when audio unavailable)
```typescript
// Send text input
socket.emit('text_input', { 
  text: userMessage 
});
```

### Authentication & Security

1. **Frontend → Backend**: JWT token from login
2. **Backend → ElevenLabs**: 
   - Public agents: No authentication needed (MVP)
   - Private agents: API key on backend generates signed URLs

### Data Flow Diagram
```
User Speech → Audio Recording → Base64 Encoding → WebSocket → Backend
    ↓
Backend → Format Audio → Send to ElevenLabs → Get Response
    ↓
ElevenLabs Response → Parse Text/Audio → Send to Frontend
    ↓
Frontend → Display Text → Play Audio → Update UI
```

### Frontend State Management
```typescript
interface ConversationState {
  conversationId: string;
  isConnected: boolean;
  isRecording: boolean;
  isSpeaking: boolean;
  isAgentThinking: boolean;
  userTranscript: string;
  agentText: string;
  messages: Message[];
}
```

## Quick Start Guide

### 1. Environment Setup
```bash
# Backend .env
ELEVENLABS_API_KEY=your_api_key_here  # Only for private agents
ELEVENLABS_AGENT_ID_JUNG=public_agent_id
ELEVENLABS_AGENT_ID_LAKSHMI=public_agent_id
JWT_SECRET=your_jwt_secret
FRONTEND_URL=http://localhost:3000
WS_HOST=localhost:3001
```

### 2. Database Migration
```sql
-- Add elevenlabs_session_id to conversations table
ALTER TABLE conversations 
ADD COLUMN elevenlabs_session_id TEXT;
```

### 3. Server Integration
```typescript
// In your main server file
import { createConversationalAIWebSocketServer } from './conversational-ai/websocket/websocket.server';

// After creating HTTP server
const wsServer = createConversationalAIWebSocketServer(httpServer);
```

### 4. Route Registration
```typescript
// In your routes file
import { conversationController } from './conversational-ai/api/conversation.controller';

router.post('/api/conversations/start', authenticate, conversationController.startConversation);
router.post('/api/conversations/:id/end', authenticate, conversationController.endConversation);
router.get('/api/conversations/:id/history', authenticate, conversationController.getConversationHistory);
router.get('/api/conversations', authenticate, conversationController.getUserConversations);
```

## Resources

- [ElevenLabs Conversational AI Docs](https://elevenlabs.io/docs/conversational-ai/overview)
- [Socket.IO Documentation](https://socket.io/docs/v4/)
- [Existing Dream Interpretation Docs](../dream-interpretation/README.md)
- [Architecture Overview](../dream-interpretation/ARCHITECTURE.md)
- [Interpreter Prompts Reference](../dream-interpretation/interpreters/)