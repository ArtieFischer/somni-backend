# WebSocket Implementation Fix

## Current Issue

We have two Socket.IO servers trying to attach to the same HTTP server:
1. Dream interpretation WebSocket (default path)
2. Conversational AI WebSocket (custom path)

This causes conflicts. Socket.IO's `path` option doesn't create separate endpoints - it changes the Socket.IO engine path for ALL namespaces.

## Correct Implementation Options

### Option 1: Use Namespaces (Recommended)

Instead of two Socket.IO servers, use one server with multiple namespaces:

```typescript
// In server-with-websocket.ts
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true
  }
});

// Dream interpretation namespace
const dreamNamespace = io.of('/dream-interpretation');
dreamNamespace.use(authMiddleware);
dreamNamespace.on('connection', handleDreamConnection);

// Conversational AI namespace
const conversationNamespace = io.of('/conversation');
conversationNamespace.use(authMiddleware);
conversationNamespace.on('connection', handleConversationConnection);
```

Client connects like:
```javascript
// Dream interpretation
const dreamSocket = io('http://localhost:3000/dream-interpretation', { auth });

// Conversational AI
const conversationSocket = io('http://localhost:3000/conversation', { auth });
```

### Option 2: Different Ports

Run services on different ports:
- Main API + Dream WebSocket: 3000
- Conversational AI WebSocket: 3001

### Option 3: Path-based Routing (Current Attempt - Not Working)

The current implementation tries to use different `path` options, but this doesn't work as expected. The `path` is for the Socket.IO engine endpoint, not for creating separate Socket.IO instances.

## Why Current Implementation Appears to Work

The authentication error we're seeing is actually from the dream interpretation WebSocket, not the conversational AI one. The conversational AI WebSocket server is likely not even initialized properly due to the conflict.

## Recommended Fix

1. Refactor to use namespaces instead of separate Socket.IO servers
2. Update client connections to use namespace URLs
3. Share authentication middleware between namespaces

This follows Socket.IO best practices and avoids conflicts.