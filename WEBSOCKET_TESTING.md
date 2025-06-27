# WebSocket Testing Guide

This guide explains how to test the conversational AI WebSocket server implementation in the Somni backend.

## Overview

The Somni backend includes two WebSocket implementations:
1. **Dream Interpretation WebSocket** (`/socket.io/`) - For real-time dream interpretation conversations
2. **Conversational AI WebSocket** (`/ws/conversation`) - For voice-based conversations with interpreters

## Running the Server with WebSocket Support

### Development Mode
```bash
# Run server with WebSocket support
npm run dev:ws

# Or run specific file
tsx src/server-with-websocket.ts
```

### Production Mode
```bash
# Build the project
npm run build

# Run with WebSocket support
npm run start:ws
```

## Testing the WebSocket Implementation

### 1. Basic WebSocket Test Script

We've created a test script at `src/test-websocket.ts` that tests the dream interpretation WebSocket functionality.

```bash
# Run the WebSocket test
npm run test:websocket
```

This test script will:
- Connect to the WebSocket server
- Start a conversation with a specified interpreter (Jung by default)
- Send multiple test messages
- Display all responses
- Properly end the conversation

### 2. Configuration

Before running the test, you may need to update the configuration in `src/test-websocket.ts`:

```typescript
const TEST_CONFIG = {
  serverUrl: 'http://localhost:3000',
  authToken: 'test-jwt-token', // Replace with valid JWT token
  dreamId: 'test-dream-123',
  interpreterId: 'jung', // Options: 'jung', 'lakshmi', 'freud', 'mary'
  testMessages: [
    'What does the flying in my dream mean?',
    'I often dream about water. Is this significant?',
    'Can you explain the symbolism of the house in my dream?'
  ]
};
```

### 3. Authentication

The WebSocket server requires authentication. You'll need to:

1. **For Development**: The test token verification is simplified. Any JWT-like format will work.
2. **For Production**: Use a valid JWT token from your authentication system.

To generate a test JWT token:
```javascript
// Example JWT payload
{
  "userId": "test-user-123",
  "sub": "test-user-123"
}
```

### 4. WebSocket Events

#### Client to Server Events:
- `startConversation` - Initialize a new conversation
- `sendMessage` - Send a message in the active conversation
- `endConversation` - End the current conversation
- `typing` - Send typing indicator

#### Server to Client Events:
- `connectionStatus` - Connection status updates
- `conversationStarted` - Conversation successfully started
- `agentResponse` - Response from the AI interpreter
- `agentTyping` - Agent typing indicator
- `conversationEnded` - Conversation has ended
- `error` - Error messages

## Manual Testing with Socket.IO Client

You can also test manually using a Socket.IO client tool or browser console:

```javascript
// Browser console example
const socket = io('http://localhost:3000', {
  auth: {
    token: 'your-jwt-token'
  }
});

socket.on('connect', () => {
  console.log('Connected!');
  
  // Start conversation
  socket.emit('startConversation', {
    dreamId: 'dream-123',
    interpreterId: 'jung',
    dreamInterpretation: 'I was flying...'
  });
});

socket.on('agentResponse', (data) => {
  console.log('Response:', data.response);
});
```

## Debugging

### Enable Debug Logs
```bash
DEBUG=socket.io* npm run dev:ws
```

### Common Issues

1. **Authentication Failed**
   - Ensure JWT token is valid
   - Check JWT_SECRET environment variable

2. **Connection Refused**
   - Verify server is running on correct port
   - Check CORS configuration

3. **No Response from Agent**
   - Check conversation orchestrator service
   - Verify interpreter is properly registered
   - Check OpenAI API key configuration

## WebSocket Endpoints

### Dream Interpretation WebSocket
- **URL**: `http://localhost:3000/socket.io/`
- **Namespace**: Default (/)
- **Used for**: Real-time dream interpretation conversations

### Conversational AI WebSocket
- **URL**: `http://localhost:3000/ws/conversation`
- **Namespace**: Default (/)
- **Used for**: Voice-based conversations (requires ElevenLabs integration)

## Environment Variables

Make sure these are set in your `.env` file:

```env
NODE_ENV=development
PORT=3000
JWT_SECRET=your-secret-key
OPENAI_API_KEY=your-openai-key
FRONTEND_URL=http://localhost:3001
```

## Next Steps

1. Implement proper JWT token verification
2. Add conversation persistence to database
3. Implement conversation history retrieval
4. Add rate limiting for WebSocket connections
5. Set up monitoring and analytics
6. Add WebSocket connection pooling
7. Implement graceful reconnection handling

## Production Considerations

1. Use Redis adapter for Socket.IO in multi-server deployments
2. Implement proper authentication and authorization
3. Set up WebSocket connection limits
4. Configure appropriate timeouts
5. Add monitoring and alerting
6. Use SSL/TLS for secure WebSocket connections (wss://)