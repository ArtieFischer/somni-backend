# Conversational AI - Developer Implementation Notes

## Overview
This document contains important implementation notes and context for developers continuing work on the conversational AI feature.

## Current Implementation Status (as of 2025-06-27)

### ✅ Completed Components

1. **ElevenLabs WebSocket Service** (`services/elevenlabs.service.ts`)
   - Full WebSocket client implementation with event handling
   - Automatic reconnection with exponential backoff
   - Ping/pong mechanism for connection health
   - Audio streaming support with base64 encoding
   - Comprehensive error handling and event emission

2. **Conversation Service** (`services/conversation.service.ts`)
   - Complete CRUD operations for conversations
   - Message persistence with role tracking
   - Conversation statistics (duration, message count)
   - ElevenLabs session ID tracking

3. **Conversation Context Service** (`services/conversation-context.service.ts`)
   - Integration with dream interpretation data
   - Knowledge fragment extraction from interpretations
   - Conversation history management
   - Interpretation highlights extraction

4. **WebSocket Server** (`websocket/websocket.server.ts`)
   - Socket.IO implementation with JWT authentication
   - Agent lifecycle management
   - Audio and text input handling
   - Automatic message persistence for transcriptions
   - Comprehensive error handling and reconnection support

5. **Conversational Agents**
   - `JungConversationalAgent` - Complete with personality and prompts
   - `LakshmiConversationalAgent` - Ready for implementation (follow Jung pattern)
   - Base agent class with shared functionality

6. **API Endpoints** (`api/conversation.controller.ts`)
   - All REST endpoints implemented
   - JWT authentication middleware
   - Proper error handling

## Important Implementation Details

### ElevenLabs Integration

1. **WebSocket URL Format**
   ```
   wss://api.elevenlabs.io/v1/convai/conversation?agent_id={agentId}
   ```

2. **Audio Format**
   - User audio: Base64 encoded chunks sent as `{ user_audio_chunk: base64String }`
   - Agent audio: Received as binary data in WebSocket messages

3. **Message Types**
   - `conversation_initiation_metadata` - Connection established
   - `user_transcript` - User speech transcribed
   - `agent_response` - Agent text response
   - `agent_response_audio` - Agent audio (binary)
   - `vad_score` - Voice activity detection
   - `error` - Error events

### Database Schema Requirements

The implementation assumes these tables exist:
- `conversations` - Main conversation records
- `messages` - Conversation messages
- `interpretations` - Dream interpretations
- `dreams` - Dream transcriptions

### Environment Variables Required

```env
ELEVENLABS_API_KEY=your_api_key
ELEVENLABS_AGENT_ID_JUNG=agent_id_for_jung  # Pre-configured agent from ElevenLabs dashboard
ELEVENLABS_AGENT_ID_LAKSHMI=agent_id_for_lakshmi  # Pre-configured agent from ElevenLabs dashboard
JWT_SECRET=your_jwt_secret
FRONTEND_URL=http://localhost:3000
```

### ElevenLabs Agent Configuration

**IMPORTANT**: The agent IDs above refer to pre-configured agents in your ElevenLabs dashboard. Before using this feature:

1. **Create Agents in ElevenLabs Dashboard**:
   - Go to ElevenLabs dashboard → Conversational AI → Agents
   - Create "Jung" agent:
     - Select a mature, thoughtful voice (e.g., "Daniel" or similar)
     - Choose LLM: Claude Sonnet or GPT-4 for nuanced psychological responses
     - Set temperature: 0.8
     - Add system prompt from Jung's personality
   - Create "Lakshmi" agent:
     - Select a warm, spiritual voice (e.g., "Freya" or similar)
     - Choose LLM: Claude Sonnet or Gemini for spiritual/philosophical responses
     - Set temperature: 0.8
     - Add system prompt from Lakshmi's personality

2. **Voice Selection Considerations**:
   - Jung: Professional, analytical, slightly older voice
   - Lakshmi: Warm, compassionate, spiritual tone
   - Freud: Authoritative, classical (when implemented)
   - Mary: Gentle, nurturing (when implemented)

3. **LLM Model Selection** (in ElevenLabs dashboard):
   - **For complex psychological analysis**: Claude Sonnet 3.5, GPT-4
   - **For fast responses**: Gemini Flash, GPT-4o-mini
   - **For spiritual/philosophical**: Claude, Gemini Pro

4. **Current Implementation Limitation**:
   - The `custom_llm_extra_body` in the code attempts to override settings but may not work with pre-configured agents
   - Voice settings (`stability`, `similarityBoost`) are local parameters that may not affect pre-configured voices
   - The actual voice and LLM are determined by the ElevenLabs agent configuration

## Key Design Decisions

1. **WebSocket Proxy Pattern**
   - Backend acts as proxy between frontend and ElevenLabs
   - Enables auth, logging, and message persistence
   - Allows fallback to text-based conversation

2. **Stateless MVP Design**
   - No Redis or message queues
   - In-memory agent management
   - Simple reconnection logic

3. **Personality Reuse**
   - Conversational agents extend dream interpreters
   - Maintains consistency across features
   - Shares knowledge base and personality traits

## Areas Needing Attention

### 1. Lakshmi Agent Implementation
The Lakshmi conversational agent needs prompts. Follow the Jung pattern:
- Create `lakshmi.prompts.ts` in the prompts directory
- Implement conversation starters, follow-ups, and closings
- Maintain Vedantic philosophical perspective

### 2. Testing
Create test files for:
- WebSocket connection flow
- Message persistence
- Context building
- Error scenarios
- Reconnection logic

### 3. Audio Processing
Current implementation uses base64 encoding. Consider:
- Audio compression for bandwidth
- Format conversion if needed
- Chunking strategies for large audio

### 4. Production Considerations

1. **Security**
   - Validate agent IDs against whitelist
   - Rate limiting for WebSocket connections
   - Audio file size limits

2. **Scalability**
   - Consider Redis for distributed WebSocket servers
   - Message queue for audio processing
   - Horizontal scaling strategy

3. **Monitoring**
   - WebSocket connection metrics
   - Audio processing latency
   - Conversation duration tracking
   - Error rate monitoring

## Testing the Implementation

### Manual Testing Flow

1. **Start a conversation**
   ```bash
   POST /api/conversations/start
   {
     "dreamId": "existing-dream-id",
     "interpreterId": "jung"
   }
   ```

2. **Connect WebSocket**
   ```javascript
   const socket = io('/ws/conversation', {
     auth: { token: 'jwt-token' },
     query: { conversationId: 'conversation-id' }
   });
   ```

3. **Send audio/text**
   ```javascript
   // Audio
   socket.emit('audio_chunk', { chunk: audioArrayBuffer });
   
   // Text fallback
   socket.emit('text_input', { text: 'Hello' });
   ```

4. **Handle responses**
   ```javascript
   socket.on('audio_response', (chunk) => { /* Play audio */ });
   socket.on('transcription', (event) => { /* Show text */ });
   ```

### Common Issues and Solutions

1. **WebSocket Connection Fails**
   - Check JWT token validity
   - Verify conversation exists and is active
   - Check CORS configuration

2. **No Audio Response**
   - Verify ElevenLabs API key
   - Check agent ID configuration
   - Fall back to text mode

3. **Reconnection Issues**
   - Monitor reconnection events
   - Check max attempts configuration
   - Verify conversation state

## Next Steps

1. **Immediate**
   - Implement Lakshmi agent prompts
   - Create integration tests
   - Add WebSocket server to main app initialization

2. **Short Term**
   - Add Freud and Mary agents
   - Implement conversation summaries
   - Add voice activity detection UI

3. **Long Term**
   - Multi-language support
   - Advanced prompt engineering
   - Conversation analytics
   - Group conversations

## Code Quality Notes

- All async operations have proper error handling
- Events are logged for debugging
- Database operations are wrapped in try-catch
- WebSocket cleanup is handled properly
- Memory leaks prevented with proper event listener cleanup

## Contact

For questions about this implementation:
- Review the MVP documentation in `docs/`
- Check the frontend integration guide
- Examine test files for usage examples

Remember: This is an MVP implementation designed for quick deployment with clear paths for enhancement.