// Simple test for namespace WebSocket connections
const io = require('socket.io-client').io;

const PORT = process.env.PORT || '3000';
const URL = `http://localhost:${PORT}`;

console.log('🧪 Testing WebSocket Namespaces');
console.log('================================\n');

// Test 1: Dream interpretation namespace
console.log('Test 1: Dream interpretation namespace (/ws/dream)...');
const dreamSocket = io(`${URL}/ws/dream`, {
  auth: { token: 'test-token' },
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
  if (error.message === 'Authentication failed') {
    console.log('   (This is expected - authentication is working)');
  }
});

// Test 2: Conversational AI namespace
setTimeout(() => {
  console.log('\nTest 2: Conversational AI namespace (/ws/conversation)...');
  const conversationSocket = io(`${URL}/ws/conversation`, {
    auth: { token: 'test-token' },
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
    if (error.message === 'Authentication failed') {
      console.log('   (This is expected - authentication is working)');
    }
  });
}, 2000);

// Test 3: Invalid namespace (should fail)
setTimeout(() => {
  console.log('\nTest 3: Invalid namespace (/ws/invalid)...');
  const invalidSocket = io(`${URL}/ws/invalid`, {
    auth: { token: 'test-token' },
    transports: ['websocket', 'polling'],
    timeout: 1000
  });

  invalidSocket.on('connect', () => {
    console.log('❌ Connected to invalid namespace (this should not happen)');
    invalidSocket.disconnect();
  });

  invalidSocket.on('connect_error', (error) => {
    console.log('✅ Invalid namespace correctly rejected');
    console.log('   Error:', error.message);
  });
}, 4000);

// Exit after tests
setTimeout(() => {
  console.log('\n📊 Summary:');
  console.log('Namespaces are properly configured if you see authentication errors');
  console.log('for /ws/dream and /ws/conversation (not connection errors)');
  process.exit(0);
}, 6000);