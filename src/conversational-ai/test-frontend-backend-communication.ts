/**
 * Test script to verify frontend-backend audio communication specification
 */

const io = require('socket.io-client');
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3001';
const AUTH_TOKEN = process.env.TEST_AUTH_TOKEN || '';

console.log('🔍 Testing Frontend-Backend Audio Communication\n');

async function testCommunicationSpec() {
  const socket: any = io(`${BACKEND_URL}/conversational-ai`, {
    auth: {
      token: AUTH_TOKEN
    },
    transports: ['websocket']
  });

  let testsPassed = 0;
  let testsFailed = 0;

  socket.on('connect', () => {
    console.log('✅ Connected to WebSocket');
    
    // Initialize conversation
    socket.emit('initialize_conversation', {
      dreamId: 'test-spec-compliance',
      interpreterId: 'jung'
    });
  });

  socket.on('conversation_initialized', (data: any) => {
    console.log('✅ Conversation initialized:', data);
    console.log('\n📋 Running specification compliance tests...\n');
    
    // Start tests
    runTests(socket);
  });

  // Test 1: Audio chunk format
  socket.on('audio_chunk', (data: any) => {
    console.log('\n📊 Test 1: Audio chunk format');
    
    if (data.chunk && (data.chunk instanceof ArrayBuffer || Buffer.isBuffer(data.chunk))) {
      console.log('✅ chunk is ArrayBuffer/Buffer');
      testsPassed++;
    } else {
      console.log('❌ chunk is not ArrayBuffer/Buffer:', typeof data.chunk);
      testsFailed++;
    }
    
    if ('isLast' in data) {
      console.log('✅ isLast property exists:', data.isLast);
      testsPassed++;
    } else {
      console.log('❌ isLast property missing');
      testsFailed++;
    }
  });

  // Test 2: Transcription format
  socket.on('transcription', (event: any) => {
    console.log('\n📊 Test 2: Transcription format');
    
    const requiredFields = ['text', 'isFinal', 'speaker', 'timestamp'];
    requiredFields.forEach(field => {
      if (field in event) {
        console.log(`✅ ${field} exists:`, event[field]);
        testsPassed++;
      } else {
        console.log(`❌ ${field} missing`);
        testsFailed++;
      }
    });
  });

  // Test 3: ElevenLabs conversation initiated
  socket.on('elevenlabs_conversation_initiated', (data: any) => {
    console.log('\n📊 Test 3: ElevenLabs conversation initiated format');
    
    if (data.audioFormat) {
      console.log('✅ audioFormat exists:', data.audioFormat);
      testsPassed++;
    } else {
      console.log('❌ audioFormat missing');
      testsFailed++;
    }
    
    if (data.conversationId) {
      console.log('✅ conversationId exists:', data.conversationId);
      testsPassed++;
    } else {
      console.log('❌ conversationId missing');
      testsFailed++;
    }
  });

  // Test 4: ElevenLabs disconnected format
  socket.on('elevenlabs_disconnected', (data: any) => {
    console.log('\n📊 Test 4: ElevenLabs disconnected format');
    
    if (data.reason) {
      console.log('✅ reason exists:', data.reason);
      testsPassed++;
    } else {
      console.log('❌ reason missing');
      testsFailed++;
    }
    
    console.log('🔍 timeout property:', data.timeout || 'not present (optional)');
  });

  socket.on('agent_response', (response: any) => {
    console.log('\n📊 Agent response received:', {
      hasText: !!response.text,
      textPreview: response.text?.substring(0, 50) + '...'
    });
  });

  socket.on('error', (error: any) => {
    console.error('❌ Error:', error);
  });

  // Wait a bit then show results
  setTimeout(() => {
    console.log('\n📊 Test Results:');
    console.log(`✅ Passed: ${testsPassed}`);
    console.log(`❌ Failed: ${testsFailed}`);
    console.log('\n✨ Test completed');
    socket.disconnect();
    process.exit(testsFailed > 0 ? 1 : 0);
  }, 10000);
}

function runTests(socket: any) {
  // Test audio streaming
  console.log('🎤 Sending test audio chunks...');
  
  // Simulate PCM WAV chunks
  for (let i = 0; i < 5; i++) {
    const fakeAudioData = Buffer.alloc(640); // 40ms of 16kHz mono
    fakeAudioData.fill(i);
    const base64Audio = fakeAudioData.toString('base64');
    
    socket.emit('send_audio', { audio: base64Audio });
    console.log(`📤 Sent audio chunk ${i + 1}`);
  }
  
  // Send end signal
  setTimeout(() => {
    console.log('\n🛑 Sending user-audio-end signal...');
    socket.emit('user-audio-end');
  }, 1000);
  
  // Test text message
  setTimeout(() => {
    console.log('\n💬 Sending text message...');
    socket.emit('send_text', { text: 'Test message for spec compliance' });
  }, 2000);
}

// Run test
if (!AUTH_TOKEN) {
  console.error('❌ TEST_AUTH_TOKEN not set. Please set it in .env');
  process.exit(1);
}

testCommunicationSpec().catch(console.error);