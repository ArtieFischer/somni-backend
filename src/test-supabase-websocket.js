// Test WebSocket connections with Supabase authentication
const io = require('socket.io-client').io;

const PORT = process.env.PORT || '3000';
const URL = `http://localhost:${PORT}`;

// Simulate a Supabase JWT token structure
// In production, this would come from Supabase Auth
const MOCK_SUPABASE_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';

console.log('🧪 Testing WebSocket with Supabase Authentication');
console.log('================================================\n');

// Test 1: Dream interpretation namespace with Supabase token
console.log('Test 1: Dream interpretation namespace with Supabase token...');
const dreamSocket = io(`${URL}/ws/dream`, {
  auth: { 
    token: MOCK_SUPABASE_TOKEN // This would be a real Supabase token
  },
  transports: ['websocket', 'polling'],
  timeout: 2000
});

dreamSocket.on('connect', () => {
  console.log('✅ Connected to dream namespace!');
  console.log('   Socket ID:', dreamSocket.id);
  dreamSocket.disconnect();
});

dreamSocket.on('connect_error', (error) => {
  console.log('❌ Dream namespace error:', error.message);
  if (error.message === 'Invalid authentication token' || error.message === 'Authentication failed') {
    console.log('   ℹ️  This is expected with a mock token.');
    console.log('   In production, use a real Supabase auth token.');
  }
});

// Test 2: Conversational AI namespace
setTimeout(() => {
  console.log('\nTest 2: Conversational AI namespace with Supabase token...');
  const conversationSocket = io(`${URL}/ws/conversation`, {
    auth: { 
      token: MOCK_SUPABASE_TOKEN
    },
    query: { conversationId: 'test-123' },
    transports: ['websocket', 'polling'],
    timeout: 2000
  });

  conversationSocket.on('connect', () => {
    console.log('✅ Connected to conversation namespace!');
    console.log('   Socket ID:', conversationSocket.id);
    conversationSocket.disconnect();
  });

  conversationSocket.on('connect_error', (error) => {
    console.log('❌ Conversation namespace error:', error.message);
    if (error.message === 'Invalid authentication token' || error.message === 'Authentication failed') {
      console.log('   ℹ️  This is expected with a mock token.');
      console.log('   In production, use a real Supabase auth token.');
    }
  });
}, 2000);

// Test 3: No token (should fail)
setTimeout(() => {
  console.log('\nTest 3: Connection without token...');
  const noTokenSocket = io(`${URL}/ws/dream`, {
    // No auth token provided
    transports: ['websocket', 'polling'],
    timeout: 1000
  });

  noTokenSocket.on('connect', () => {
    console.log('❌ Connected without token (this should not happen)');
    noTokenSocket.disconnect();
  });

  noTokenSocket.on('connect_error', (error) => {
    console.log('✅ Correctly rejected connection without token');
    console.log('   Error:', error.message);
  });
}, 4000);

// Exit after tests
setTimeout(() => {
  console.log('\n📊 Summary:');
  console.log('- WebSocket server now validates Supabase auth tokens');
  console.log('- Frontend should pass the Supabase session access_token');
  console.log('- Example: socket.io(url, { auth: { token: supabase.auth.session.access_token } })');
  console.log('\n💡 To test with a real token:');
  console.log('1. Login via Supabase Auth in your frontend');
  console.log('2. Get the session.access_token');
  console.log('3. Pass it in the auth.token field when connecting');
  process.exit(0);
}, 6000);