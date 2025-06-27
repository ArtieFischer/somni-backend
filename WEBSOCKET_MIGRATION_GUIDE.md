# WebSocket Migration Guide

## Overview

We've migrated from two separate Socket.IO servers to a unified server using namespaces. This follows Socket.IO best practices and prevents conflicts.

## What Changed

### Before (Two Servers)
```typescript
// Dream interpretation on default path
const dreamWS = createWebSocketHandler(httpServer);

// Conversational AI on custom path
const conversationalWS = createConversationalAIWebSocketServer(httpServer);
```

### After (Unified Server with Namespaces)
```typescript
// Single server with namespaces
const unifiedWebSocketServer = createUnifiedWebSocketServer(httpServer);
```

## Client Connection Changes

### Dream Interpretation
```javascript
// Before
const socket = io('http://localhost:3000', {
  auth: { token: 'jwt-token' }
});

// After
const socket = io('http://localhost:3000/ws/dream', {
  auth: { token: 'jwt-token' }
});
```

### Conversational AI
```javascript
// Before
const socket = io('http://localhost:3000', {
  path: '/ws/conversation',
  auth: { token: 'jwt-token' },
  query: { conversationId: 'conv-id' }
});

// After
const socket = io('http://localhost:3000/ws/conversation', {
  auth: { token: 'jwt-token' },
  query: { conversationId: 'conv-id' }
});
```

## Server Structure

```
src/
├── websocket/
│   └── unified-websocket-server.ts     # Main WebSocket server
├── dream-interpretation/
│   └── websocket/
│       └── dream-interpretation-handler.ts  # Dream namespace handler
└── conversational-ai/
    └── websocket/
        └── conversational-ai-handler.ts     # Conversation namespace handler
```

## Testing

Run these commands to test the new implementation:

```bash
# Simple connectivity test
npm run test:namespace-simple

# Full namespace test (requires valid JWT)
npm run test:namespace
```

## Benefits

1. **Single Socket.IO instance**: Better resource utilization
2. **Clear namespace separation**: `/ws/dream` and `/ws/conversation`
3. **Shared authentication**: One auth middleware for all namespaces
4. **No port conflicts**: Everything runs on the same HTTP server
5. **Easier scaling**: Can add more namespaces easily

## Deployment

No changes needed for Railway deployment. The WebSocket server still runs on the same port as the HTTP server.

## Frontend Updates Required

Update your frontend Socket.IO connections to use the namespace URLs:
- Dream interpretation: `${API_URL}/ws/dream`
- Conversational AI: `${API_URL}/ws/conversation`

Remove any custom `path` options from the Socket.IO client configuration.