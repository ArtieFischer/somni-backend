// Test WebSocket with correct port (3000)
const io = require('socket.io-client').io;

console.log('Testing WebSocket connection on correct port...');
console.log('URL: http://localhost:3000');
console.log('Path: /ws/conversation\n');

const socket = io('http://localhost:3000', {
  path: '/ws/conversation',
  auth: { token: 'test' },
  query: { conversationId: 'test' },
  transports: ['websocket', 'polling']
});

socket.on('connect', () => {
  console.log('✅ Connected successfully!');
  console.log('Socket ID:', socket.id);
  socket.disconnect();
  process.exit(0);
});

socket.on('connect_error', (error) => {
  console.log('❌ Connection error:', error.message);
  if (error.message.includes('Authentication')) {
    console.log('✅ Good! Server is running and auth middleware is working');
    console.log('   Connection rejected due to invalid authentication');
  } else {
    console.log('Error type:', error.type);
    console.log('Full error:', error);
  }
});

setTimeout(() => {
  console.log('\n❌ Connection timeout');
  process.exit(1);
}, 5000);