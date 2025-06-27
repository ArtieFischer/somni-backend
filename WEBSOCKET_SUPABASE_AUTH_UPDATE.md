# WebSocket Supabase Authentication Update

## Changes Made

### 1. Updated WebSocket Authentication
The WebSocket server now uses Supabase authentication instead of custom JWT tokens.

**File: `/src/websocket/unified-websocket-server.ts`**
- Removed JWT import and custom token validation
- Added Supabase token validation using `supabaseService.auth.getUser(token)`
- Socket now stores user data from Supabase auth

### 2. Updated Conversation Controller
**File: `/src/conversational-ai/api/conversation.controller.ts`**
- Removed JWT generation for WebSocket connections
- Now passes through the Supabase token from the request
- Uses `isAuthenticated` middleware from auth module

## Frontend Connection Example

```javascript
// 1. Login with Supabase
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'user@example.com',
  password: 'password'
});

// 2. Get the access token
const token = data.session.access_token;

// 3. Connect to WebSocket with Supabase token
const socket = io('http://localhost:3000/ws/conversation', {
  auth: {
    token: token // Supabase access token
  },
  query: {
    conversationId: 'conv-123' // Optional conversation ID
  }
});

// 4. Handle connection events
socket.on('connect', () => {
  console.log('Connected to WebSocket');
});

socket.on('connect_error', (error) => {
  console.log('Connection error:', error.message);
});
```

## Testing

Run the test script to verify the authentication:
```bash
npm run test:namespace-simple
# or
node src/test-supabase-websocket.js
```

## Key Points

1. **No More Custom JWT**: The backend no longer generates custom JWTs for WebSocket connections
2. **Use Supabase Tokens**: Frontend must use Supabase session access tokens
3. **Token Validation**: Backend validates tokens with Supabase Auth service
4. **User Data**: User information is extracted from Supabase auth response

## Security Benefits

- Centralized authentication through Supabase
- No need to manage JWT secrets
- Automatic token expiration handling
- Built-in security features from Supabase

## Migration Notes

If you have existing frontend code using custom JWT tokens:
1. Remove any JWT token generation/storage logic
2. Use Supabase auth session tokens instead
3. Update WebSocket connection code to use Supabase tokens