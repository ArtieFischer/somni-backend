// Debug WebSocket test - try different configurations
const io = require('socket.io-client').io;

console.log('🔍 WebSocket Debug Test\n');

// Test 1: Default Socket.IO path
console.log('Test 1: Default Socket.IO path (/socket.io/)...');
const socket1 = io('http://localhost:8080', {
  transports: ['websocket', 'polling'],
  timeout: 2000
});

socket1.on('connect', () => {
  console.log('✅ Connected with default path!');
  console.log('   This is the dream interpretation WebSocket');
  socket1.disconnect();
});

socket1.on('connect_error', (error) => {
  console.log('❌ Default path error:', error.type, error.message);
});

// Test 2: Conversational AI path
setTimeout(() => {
  console.log('\nTest 2: Conversational AI path (/ws/conversation)...');
  const socket2 = io('http://localhost:8080', {
    path: '/ws/conversation',
    transports: ['websocket', 'polling'],
    auth: { token: 'test' },
    query: { conversationId: 'test' },
    timeout: 2000
  });

  socket2.on('connect', () => {
    console.log('✅ Connected with /ws/conversation path!');
    socket2.disconnect();
  });

  socket2.on('connect_error', (error) => {
    console.log('❌ Conversational AI path error:', error.type, error.message);
  });
}, 3000);

// Test 3: Check HTTP endpoint
setTimeout(() => {
  console.log('\nTest 3: HTTP endpoint check...');
  const http = require('http');
  
  http.get('http://localhost:8080/', (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      console.log('✅ HTTP server responding:', data);
    });
  }).on('error', (err) => {
    console.log('❌ HTTP error:', err.message);
  });
}, 6000);

setTimeout(() => {
  console.log('\n📊 Summary:');
  console.log('If only Test 1 works: Conversational AI WebSocket not initialized');
  console.log('If neither works: Server not running or wrong port');
  console.log('If both work: Everything is configured correctly');
  process.exit(0);
}, 9000);