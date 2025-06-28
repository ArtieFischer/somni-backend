/**
 * Test script to debug timeout behavior
 * Run this to verify timeout events are being received
 */

const io = require('socket.io-client');
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3001';
const AUTH_TOKEN = process.env.TEST_AUTH_TOKEN || '';

let socket: any;

async function testTimeout() {
  console.log('🔄 Testing ElevenLabs timeout behavior...\n');
  
  // Connect to WebSocket
  socket = io(`${BACKEND_URL}/conversation`, {
    auth: {
      token: AUTH_TOKEN
    },
    transports: ['websocket']
  });

  socket.on('connect', () => {
    console.log('✅ Connected to WebSocket');
  });

  socket.on('error', (error: any) => {
    console.error('❌ Socket error:', error);
  });

  socket.on('conversation_initialized', (data: any) => {
    console.log('✅ Conversation initialized:', data);
    console.log('\n⏱️  Waiting for timeout (should occur after ~60 seconds of inactivity)...\n');
  });

  socket.on('inactivity_timeout', (data: any) => {
    console.log('🔔 RECEIVED INACTIVITY TIMEOUT EVENT:', data);
    console.log('   Detected by:', data.detectedBy);
    console.log('   Timestamp:', data.timestamp);
    console.log('   Message:', data.message);
  });

  socket.on('elevenlabs_disconnected', (data: any) => {
    console.log('🔔 RECEIVED ELEVENLABS DISCONNECTED EVENT:', data);
    console.log('   Code:', data.code);
    console.log('   Reason:', data.reason);
    console.log('   Is Inactivity Timeout:', data.isInactivityTimeout);
  });

  socket.on('disconnect', (reason: string) => {
    console.log('🔌 Socket disconnected:', reason);
  });

  // Initialize conversation
  socket.emit('initialize_conversation', {
    dreamId: 'test-dream-id',
    interpreterId: 'jung'
  });

  // Keep the script running
  console.log('\n💡 Script will run for 3 minutes to observe timeout behavior...');
  console.log('   ElevenLabs timeout: ~60 seconds');
  console.log('   Proactive detection: ~65 seconds\n');
  
  setTimeout(() => {
    console.log('\n✅ Test completed');
    socket.disconnect();
    process.exit(0);
  }, 180000); // 3 minutes
}

// Handle errors
process.on('unhandledRejection', (error) => {
  console.error('Unhandled rejection:', error);
  if (socket) socket.disconnect();
  process.exit(1);
});

// Run test
testTimeout().catch(console.error);