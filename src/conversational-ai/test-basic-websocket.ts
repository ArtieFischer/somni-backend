/**
 * Basic WebSocket connectivity test
 * Tests if the WebSocket server is running and accessible
 */
import * as SocketIOClient from 'socket.io-client';
const io = SocketIOClient.io || SocketIOClient.default || SocketIOClient;
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const WS_URL = process.env.WS_URL || 'http://localhost:8080';

console.log('🧪 Basic WebSocket Connectivity Test');
console.log('===================================');
console.log('WebSocket URL:', WS_URL);
console.log('Path: /ws/conversation\n');

// Try to connect without authentication
const socket = io(WS_URL, {
  path: '/ws/conversation',
  auth: { token: 'test-token' }, // Invalid token to test error handling
  query: { conversationId: 'test-conversation' },
  transports: ['websocket'],
  reconnection: false
});

let connected = false;

socket.on('connect', () => {
  connected = true;
  console.log('✅ WebSocket connected successfully!');
  console.log('   Socket ID:', socket.id);
  console.log('\nThis means the WebSocket server is running.');
  console.log('The connection will likely be rejected due to invalid auth.');
});

socket.on('connect_error', (error: any) => {
  console.log('❌ Connection error:', error.message);
  
  if (error.message.includes('Authentication')) {
    console.log('\n✅ Good! The server is running and auth middleware is working.');
    console.log('   The connection was rejected due to invalid authentication.');
    console.log('\nTo test with real authentication:');
    console.log('1. Run: npm run setup:conversational-test');
    console.log('2. Use the credentials in: npm run test:conversational-ws');
  } else {
    console.log('\n❌ Unexpected error. The server might not be running.');
    console.log('\nTroubleshooting:');
    console.log('1. Make sure the server is running: npm run dev:ws');
    console.log('2. Check that port 8080 is not in use');
    console.log('3. Verify WebSocket path is /ws/conversation');
  }
});

socket.on('error', (error: any) => {
  console.log('Socket error:', error);
});

// Give it 5 seconds to connect
setTimeout(() => {
  if (!connected && !socket.connected) {
    console.log('\n❌ Could not establish WebSocket connection.');
    console.log('Make sure the server is running with: npm run dev:ws');
  }
  socket.disconnect();
  process.exit(connected ? 0 : 1);
}, 5000);

// Handle process termination
process.on('SIGINT', () => {
  console.log('\n\nShutting down...');
  socket.disconnect();
  process.exit(0);
});