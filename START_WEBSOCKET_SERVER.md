# How to Start the WebSocket Server

## Development Mode (Recommended for Testing)

Open a new terminal and run:
```bash
npm run dev:ws
```

This will start the server with WebSocket support on port 3000.

## Production Build

If you want to build and run the production version:
```bash
npm run build
npm run start:ws
```

Note: The build currently has some TypeScript errors in test files, but the main server code should work.

## Verify Server is Running

Once the server is running, you should see:
```
Unified WebSocket server initialized with namespaces:
  - Dream interpretation: /ws/dream  
  - Conversational AI: /ws/conversation
Server is running on port 3000
```

## Then Test

In another terminal:
```bash
npm run test:namespace-simple
```

You should see "Authentication failed" errors (not "websocket error"), which confirms the namespaces are working.