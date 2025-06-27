# Railway WebSocket Deployment Guide

## Configuration Changes Made ✅

1. **railway.toml** - Changed `startCommand` from `npm run start` to `npm run start:ws`
2. **railway.json** - Updated to use WebSocket server

## What This Enables

- **Dream Interpretation WebSocket** at `/ws/dream`
- **Conversational AI WebSocket** at `/ws/conversation`
- All regular HTTP endpoints continue to work

## Railway WebSocket Support

Railway fully supports WebSocket connections:
- ✅ No additional configuration needed
- ✅ WebSockets work on the same domain/port as HTTP
- ✅ Automatic SSL/TLS for secure WebSocket connections (wss://)
- ✅ No special headers or proxy configuration required

## Deployment Steps

1. **Commit the changes**:
   ```bash
   git add railway.toml railway.json
   git commit -m "feat: enable websocket server for deployment"
   git push
   ```

2. **Deploy to Railway**:
   - Railway will automatically detect the changes
   - The new build will use the WebSocket-enabled server

3. **Verify Deployment**:
   - Check Railway logs for: "Unified WebSocket server initialized"
   - You should see:
     ```
     Unified WebSocket server initialized with namespaces:
       - Dream interpretation: /ws/dream
       - Conversational AI: /ws/conversation
     Server is running on port 3000
     ```

## Frontend Configuration

Update your frontend to connect to the Railway WebSocket endpoints:

```javascript
// Production WebSocket URLs
const WS_URL = 'wss://your-app.railway.app';  // Railway provides SSL automatically

// Dream Interpretation
const dreamSocket = io(`${WS_URL}/ws/dream`, {
  auth: { token: jwtToken }
});

// Conversational AI
const conversationSocket = io(`${WS_URL}/ws/conversation`, {
  auth: { token: jwtToken },
  query: { conversationId: 'conv-id' }
});
```

## Environment Variables

Make sure these are set in Railway:
- `JWT_SECRET` - For authentication
- `SUPABASE_URL` - Your Supabase URL
- `SUPABASE_ANON_KEY` - Supabase anonymous key
- `SUPABASE_SERVICE_KEY` - Supabase service key
- `OPENAI_API_KEY` - For AI services
- `ELEVENLABS_API_KEY` - For conversational AI (if using)

## Testing WebSocket Connection

After deployment, test the WebSocket connection:

```javascript
// Quick test script
const io = require('socket.io-client');

const socket = io('wss://your-app.railway.app/ws/dream', {
  auth: { token: 'your-jwt-token' },
  transports: ['websocket']
});

socket.on('connect', () => {
  console.log('Connected!');
  socket.disconnect();
});

socket.on('connect_error', (error) => {
  console.error('Connection error:', error.message);
});
```

## Monitoring

1. **Railway Logs**: Check for WebSocket connection logs
2. **Metrics**: Monitor WebSocket connections in Railway metrics
3. **Health Check**: The `/health` endpoint still works for monitoring

## Rollback

If you need to rollback to non-WebSocket server:
1. Change `startCommand` back to `npm run start` in both config files
2. Commit and push

## Important Notes

- Railway handles WebSocket scaling automatically
- No need to configure sticky sessions (Railway handles this)
- WebSocket connections count towards your Railway usage
- The unified WebSocket server is more efficient than the previous dual-server approach