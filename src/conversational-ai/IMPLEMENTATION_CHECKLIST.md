# Conversational AI Implementation Checklist

## To Complete the Implementation

### 1. Add WebSocket Server to Main App

In your main application file (e.g., `src/app.ts` or `src/server.ts`), add:

```typescript
import { createConversationalAIWebSocketServer } from './conversational-ai/websocket/websocket.server';

// After creating HTTP server
const httpServer = http.createServer(app);

// Initialize conversational AI WebSocket server
const conversationalAI = createConversationalAIWebSocketServer(httpServer);

// Start server
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`WebSocket server available at /ws/conversation`);
});
```

### 2. Add Routes to Express App

```typescript
import { conversationRouter } from './conversational-ai/api/conversation.controller';

// In your routes setup
app.use('/api/conversations', conversationRouter);
```

### 3. Database Migrations

Create these tables if they don't exist:

```sql
-- Conversations table
CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  dream_id UUID REFERENCES dreams(id),
  interpreter_id VARCHAR(50) NOT NULL,
  elevenlabs_session_id VARCHAR(255),
  status VARCHAR(20) DEFAULT 'active',
  started_at TIMESTAMP DEFAULT NOW(),
  ended_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Messages table
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES conversations(id),
  role VARCHAR(20) NOT NULL, -- 'user' or 'assistant'
  content TEXT NOT NULL,
  audio_url TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_conversations_user_id ON conversations(user_id);
CREATE INDEX idx_conversations_dream_id ON conversations(dream_id);
CREATE INDEX idx_messages_conversation_id ON messages(conversation_id);
```

### 4. Environment Variables

Add to `.env`:

```bash
# ElevenLabs Configuration
ELEVENLABS_API_KEY=your_api_key_here
ELEVENLABS_AGENT_ID_JUNG=your_jung_agent_id
ELEVENLABS_AGENT_ID_LAKSHMI=your_lakshmi_agent_id

# WebSocket Configuration
FRONTEND_URL=http://localhost:3000
```

### 5. Install Dependencies

```bash
npm install socket.io ws @types/ws
```

### 6. Implement Lakshmi Prompts

Create `src/conversational-ai/prompts/lakshmi.prompts.ts`:

```typescript
export const lakshmiConversationalPrompts = {
  conversationStarters: {
    general: "Namaste. I have shared my understanding of your dream's spiritual significance. What aspect of this divine message resonates most deeply with your soul?",
    
    symbolFocused: "The presence of {{symbol}} in your dream carries profound spiritual meaning. In Vedantic wisdom, this often represents a teaching from your higher Self. What does {{symbol}} mean in your personal spiritual journey?",
    
    emotionFocused: "The emotions in your dream are messengers from your soul. How do these feelings connect to your current spiritual path or life circumstances?",
    
    spiritualFocused: "Your dream appears to be a communication from the divine consciousness within you. Have you been seeking guidance or experiencing spiritual transitions recently?"
  },
  
  followUpTemplates: {
    exploringSymbols: "Beautiful. Your connection to {{symbol}} reveals {{spiritual_meaning}}. In the Upanishads, such symbols often guide us toward self-realization. How might this wisdom apply to your current life situation?",
    
    karmicPatterns: "What you're describing reflects karmic patterns seeking resolution. This dream may be showing you an opportunity for spiritual growth. What lessons do you feel your soul is ready to learn?",
    
    divineGuidance: "The divine within you is speaking through this dream. The tension between {{element1}} and {{element2}} suggests a choice point on your spiritual path. What does your inner wisdom tell you?",
    
    chakraAlignment: "This dream element relates to your {{chakra}} chakra. When this energy center seeks balance, such dreams often arise. How is this area of your life calling for attention?",
    
    soulPurpose: "Your dream seems connected to your dharma - your soul's purpose. The emphasis on {{theme}} suggests your higher Self is guiding you. What calling have you been feeling lately?"
  }
};
```

### 7. TypeScript Configuration

Ensure your `tsconfig.json` includes:

```json
{
  "compilerOptions": {
    "lib": ["ES2020", "DOM"],
    "types": ["node", "socket.io", "ws"]
  }
}
```

## Quick Verification Steps

1. **REST API Works**
   ```bash
   curl http://localhost:8080/api/conversations/health
   ```

2. **WebSocket Connects**
   - Use Socket.IO client or testing tool
   - Should connect to `/ws/conversation`

3. **Database Operations**
   - Check conversations are created
   - Verify messages are saved

4. **Error Handling**
   - Test with invalid tokens
   - Try non-existent conversations

## Production Readiness

- [ ] Add rate limiting to WebSocket connections
- [ ] Implement connection pooling for database
- [ ] Add monitoring/logging for WebSocket events
- [ ] Set up audio file storage (if keeping recordings)
- [ ] Configure CORS for production domain
- [ ] Add health check endpoints
- [ ] Set up graceful shutdown handling
- [ ] Configure SSL/TLS for WebSocket
- [ ] Add connection timeout handling
- [ ] Implement session recovery after disconnect