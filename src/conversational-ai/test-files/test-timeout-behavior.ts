import { io, Socket } from 'socket.io-client';
import * as dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../../.env') });

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3001';
const TEST_TOKEN = process.env.TEST_AUTH_TOKEN || ''; // You'll need to set this

console.log('Testing ElevenLabs timeout behavior...');
console.log('Backend URL:', BACKEND_URL);

async function testTimeoutBehavior() {
  let socket: Socket | null = null;

  try {
    // Connect to the conversational AI namespace
    socket = io(`${BACKEND_URL}/conversational-ai`, {
      auth: {
        token: TEST_TOKEN
      },
      transports: ['websocket']
    });

    socket.on('connect', () => {
      console.log('✅ Connected to WebSocket');
      
      // Initialize a conversation
      socket!.emit('initialize_conversation', {
        dreamId: 'test-dream-id',
        interpreterId: 'jung'
      });
    });

    socket.on('conversation_initialized', (data) => {
      console.log('✅ Conversation initialized:', data);
    });

    socket.on('conversation_started', (data) => {
      console.log('✅ Conversation started:', data);
      console.log('\n⏳ Now waiting for timeout (should occur after ~60 seconds of inactivity)...');
    });

    socket.on('inactivity_timeout', (data) => {
      console.log('\n🔔 TIMEOUT EVENT RECEIVED:', data);
      console.log('Timestamp:', new Date().toISOString());
    });

    socket.on('elevenlabs_disconnected', (data) => {
      console.log('\n🔌 ElevenLabs disconnected:', data);
    });

    socket.on('error', (error) => {
      console.error('❌ Error:', error);
    });

    socket.on('disconnect', (reason) => {
      console.log('\n🔌 Socket disconnected:', reason);
    });

    // Log all events for debugging
    socket.onAny((eventName, ...args) => {
      if (!['transcription', 'audio_chunk'].includes(eventName)) {
        console.log(`📨 Event: ${eventName}`, args);
      }
    });

    // Keep the script running for 2 minutes to observe timeout
    await new Promise(resolve => setTimeout(resolve, 120000));

  } catch (error) {
    console.error('Test failed:', error);
  } finally {
    if (socket) {
      socket.disconnect();
    }
    process.exit(0);
  }
}

// Instructions for running the test
console.log(`
To run this test:
1. Set TEST_AUTH_TOKEN environment variable with a valid auth token
2. Ensure the backend is running
3. Run: npx ts-node ${__filename}
4. Wait for ~60 seconds to see if timeout event is received
`);

if (!TEST_TOKEN) {
  console.error('\n❌ TEST_AUTH_TOKEN not set. Please set it in .env or as an environment variable.');
  process.exit(1);
}

testTimeoutBehavior();