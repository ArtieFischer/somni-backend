# Conversational AI Testing Guide

## Quick Start Testing

### 1. Environment Setup

First, ensure you have the required environment variables:

```bash
# .env.local
ELEVENLABS_API_KEY=your_key_here
ELEVENLABS_AGENT_ID_JUNG=jung_agent_id
ELEVENLABS_AGENT_ID_LAKSHMI=lakshmi_agent_id
JWT_SECRET=your_jwt_secret
```

### 2. Start the Backend

```bash
npm run dev
```

### 3. Test REST Endpoints

#### Start a Conversation
```bash
# First, get a valid JWT token (use your auth endpoint)
TOKEN="your_jwt_token"

# Start conversation with existing dream
curl -X POST http://localhost:8080/api/conversations/start \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "dreamId": "existing-dream-id",
    "interpreterId": "jung"
  }'
```

#### Get Conversation History
```bash
CONVERSATION_ID="returned-conversation-id"

curl -X GET "http://localhost:8080/api/conversations/$CONVERSATION_ID/history" \
  -H "Authorization: Bearer $TOKEN"
```

### 4. Test WebSocket Connection

Create a test file `test-websocket.js`:

```javascript
const io = require('socket.io-client');

const TOKEN = 'your_jwt_token';
const CONVERSATION_ID = 'your_conversation_id';

const socket = io('http://localhost:8080', {
  path: '/ws/conversation',
  auth: { token: TOKEN },
  query: { conversationId: CONVERSATION_ID }
});

socket.on('connect', () => {
  console.log('Connected to WebSocket');
});

socket.on('conversation_started', (data) => {
  console.log('Conversation started:', data);
  
  // Send a text message
  socket.emit('text_input', { 
    text: 'Tell me more about the symbols in my dream' 
  });
});

socket.on('transcription', (event) => {
  console.log(`[${event.speaker}]: ${event.text}`);
});

socket.on('error', (error) => {
  console.error('Error:', error);
});

socket.on('disconnect', () => {
  console.log('Disconnected');
});
```

Run with:
```bash
node test-websocket.js
```

## Integration Test Suite

Create `test-conversational-ai.ts`:

```typescript
import { expect } from 'chai';
import { io, Socket } from 'socket.io-client';
import axios from 'axios';

describe('Conversational AI Integration Tests', () => {
  let token: string;
  let conversationId: string;
  let socket: Socket;
  
  before(async () => {
    // Get auth token
    const authResponse = await axios.post('http://localhost:8080/api/auth/login', {
      email: 'test@example.com',
      password: 'testpass'
    });
    token = authResponse.data.token;
  });
  
  after(() => {
    if (socket) socket.disconnect();
  });
  
  it('should start a conversation', async () => {
    const response = await axios.post(
      'http://localhost:8080/api/conversations/start',
      {
        dreamId: 'test-dream-id',
        interpreterId: 'jung'
      },
      {
        headers: { Authorization: `Bearer ${token}` }
      }
    );
    
    expect(response.status).to.equal(200);
    expect(response.data).to.have.property('conversationId');
    conversationId = response.data.conversationId;
  });
  
  it('should connect to WebSocket', (done) => {
    socket = io('http://localhost:8080', {
      path: '/ws/conversation',
      auth: { token },
      query: { conversationId }
    });
    
    socket.on('connect', () => {
      done();
    });
  });
  
  it('should receive conversation starter', (done) => {
    socket.on('conversation_started', (data) => {
      expect(data).to.have.property('message');
      expect(data).to.have.property('interpreter');
      done();
    });
  });
  
  it('should handle text input', (done) => {
    socket.emit('text_input', { text: 'Hello' });
    
    socket.on('text_response', (data) => {
      expect(data).to.have.property('text');
      done();
    });
  });
});
```

## Manual Testing Checklist

### Basic Flow
- [ ] Start conversation via REST API
- [ ] Connect to WebSocket with valid token
- [ ] Receive conversation starter message
- [ ] Send text input and receive response
- [ ] View conversation history
- [ ] End conversation properly

### Error Scenarios
- [ ] Invalid JWT token rejected
- [ ] Missing conversation ID rejected
- [ ] Non-existent conversation handled
- [ ] WebSocket reconnection works
- [ ] Max reconnection attempts triggers error

### Audio Flow (when ElevenLabs configured)
- [ ] Audio chunks accepted
- [ ] Audio responses received
- [ ] Transcriptions saved to database
- [ ] Voice activity detection works

### Database Persistence
- [ ] Conversations created in database
- [ ] Messages saved with correct roles
- [ ] Timestamps recorded accurately
- [ ] ElevenLabs session ID updated

## Debugging Tips

### Enable Debug Logging

```typescript
// In your test
process.env.DEBUG = 'socket.io:*';
```

### Monitor WebSocket Events

```javascript
// Log all events
['connect', 'disconnect', 'error', 'reconnecting', 'reconnected'].forEach(event => {
  socket.on(event, (...args) => console.log(`Event: ${event}`, args));
});
```

### Check Database State

```sql
-- View active conversations
SELECT * FROM conversations WHERE status = 'active' ORDER BY started_at DESC;

-- View messages for a conversation
SELECT * FROM messages 
WHERE conversation_id = 'your-conversation-id' 
ORDER BY created_at;

-- Check interpretations
SELECT * FROM interpretations 
WHERE dream_id = 'your-dream-id';
```

## Performance Testing

### Load Test WebSocket Connections

```javascript
// load-test.js
const io = require('socket.io-client');

const NUM_CLIENTS = 10;
const clients = [];

for (let i = 0; i < NUM_CLIENTS; i++) {
  const socket = io('http://localhost:8080', {
    path: '/ws/conversation',
    auth: { token: 'valid-token' },
    query: { conversationId: `test-conv-${i}` }
  });
  
  socket.on('connect', () => {
    console.log(`Client ${i} connected`);
  });
  
  clients.push(socket);
}

// Clean up after test
setTimeout(() => {
  clients.forEach(s => s.disconnect());
}, 30000);
```

## Common Issues

### "Agent not initialized"
- Ensure conversation was started via REST API first
- Check that interpreter ID is valid ('jung' or 'lakshmi')

### No audio responses
- Verify ElevenLabs API key is set
- Check agent IDs in environment variables
- Fallback to text mode should work

### Messages not persisting
- Check database connection
- Verify message table schema
- Look for errors in logs

### WebSocket connection drops
- Check ping/pong mechanism
- Verify reconnection attempts in logs
- Monitor 'reconnecting' events