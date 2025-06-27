// Test WebSocket with namespace approach
const io = require('socket.io-client').io;

const PORT = process.env.PORT || '3000';
const URL = `http://localhost:${PORT}`;

console.log('🧪 Testing WebSocket Namespaces');
console.log('================================\n');

// Test 1: Default namespace (should work if old implementation is running)
console.log('Test 1: Default namespace connection...');
const defaultSocket = io(URL, {
  auth: { token: 'test' },
  transports: ['websocket', 'polling'],
  timeout: 2000
});

defaultSocket.on('connect', () => {
  console.log('✅ Connected to default namespace');
  defaultSocket.disconnect();
});

defaultSocket.on('connect_error', (error) => {
  console.log('❌ Default namespace error:', error.message);
});

// Test 2: Dream interpretation namespace
setTimeout(() => {
  console.log('\nTest 2: Dream interpretation namespace (/ws/dream)...');
  const dreamSocket = io(`${URL}/ws/dream`, {
    auth: { token: 'test' },
    transports: ['websocket', 'polling'],
    timeout: 2000
  });

  dreamSocket.on('connect', () => {
    console.log('✅ Connected to dream namespace!');
    dreamSocket.disconnect();
  });

  dreamSocket.on('connect_error', (error) => {
    console.log('❌ Dream namespace error:', error.message);
  });
}, 2000);

// Test 3: Conversational AI namespace
setTimeout(() => {
  console.log('\nTest 3: Conversational AI namespace (/ws/conversation)...');
  const conversationSocket = io(`${URL}/ws/conversation`, {
    auth: { token: 'test' },
    query: { conversationId: 'test-123' },
    transports: ['websocket', 'polling'],
    timeout: 2000
  });

  conversationSocket.on('connect', () => {
    console.log('✅ Connected to conversation namespace!');
    conversationSocket.disconnect();
  });

  conversationSocket.on('connect_error', (error) => {
    console.log('❌ Conversation namespace error:', error.message);
  });
}, 4000);

// Summary
setTimeout(() => {
  console.log('\n📊 Summary:');
  console.log('If namespaces are working: /ws/dream and /ws/conversation will fail with auth errors');
  console.log('If old implementation: Only default namespace shows auth error');
  console.log('\nTo use namespaces, update server to use UnifiedWebSocketServer');
  process.exit(0);
}, 6000);