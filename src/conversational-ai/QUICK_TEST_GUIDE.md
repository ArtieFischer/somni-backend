# Quick Test Guide for Conversational AI WebSocket

## Prerequisites

1. Make sure you have the `.env.local` file with:
   ```
   JWT_SECRET=your_secret_here
   ELEVENLABS_API_KEY=your_key_here (optional for MVP)
   ```

2. Ensure the database is accessible (Supabase)

## Step 1: Start the Server

In terminal 1:
```bash
npm run dev:ws
```

Wait for the message:
```
Somni Backend Service started on port 3000
WebSocket servers initialized:
  - Dream interpretation WebSocket: /ws  
  - Conversational AI WebSocket: /ws/conversation
```

Note: The default port is 3000, not 8080. If you have a custom PORT in your .env file, use that instead.

## Step 2: Test Basic Connectivity

In terminal 2:
```bash
node src/conversational-ai/test-ws-simple.js
```

Expected output:
- If server is running: "✅ Server is running, auth middleware working"
- If server is not running: "❌ Server may not be running"

## Step 3: Create Test Data (Optional)

If you want to test with real authentication:
```bash
npm run setup:conversational-test
```

This will create:
- Test user account
- Test dream
- Test interpretation
- And display the credentials

## Step 4: Test Full Flow

Update the credentials in `test-conversational-websocket.ts` with the output from step 3, then:
```bash
npm run test:conversational-ws
```

## Troubleshooting

### "websocket error"
- Server is not running → Run `npm run dev:ws`
- Wrong port → Check server is on port 3000 (or your custom PORT)
- Firewall blocking connection

### "Authentication required"
- Good! Server is running, auth middleware works
- Need valid JWT token to proceed

### TypeScript errors
- Can be ignored for testing
- Run tests with `node` directly or `tsx` command

## What's Working

When everything is set up correctly:
1. WebSocket server accepts connections at `/ws/conversation`
2. JWT authentication is enforced
3. Conversation endpoints are available at `/api/conversations/*`
4. Messages can be sent via `text_input` event
5. Responses come back via `transcription` event

## What's Not Implemented (MVP)

1. Actual ElevenLabs voice connection (needs agent IDs)
2. Audio streaming (falls back to text)
3. Some database operations may return mock data

## Next Steps

1. Configure ElevenLabs agents in dashboard
2. Add agent IDs to environment variables
3. Test voice conversations
4. Implement missing database operations as needed