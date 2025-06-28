/**
 * Test script for audio streaming implementation
 * Simulates the mobile app's audio streaming behavior
 */

const io = require('socket.io-client');
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3001';
const AUTH_TOKEN = process.env.TEST_AUTH_TOKEN || '';

console.log('🎤 Testing Audio Streaming Implementation\n');

async function testAudioStreaming() {
  const socket: any = io(`${BACKEND_URL}/conversational-ai`, {
    auth: {
      token: AUTH_TOKEN
    },
    transports: ['websocket']
  });

  socket.on('connect', () => {
    console.log('✅ Connected to WebSocket');
    
    // Initialize conversation
    socket.emit('initialize_conversation', {
      dreamId: 'test-dream-audio',
      interpreterId: 'jung'
    });
  });

  socket.on('conversation_initialized', (data: any) => {
    console.log('✅ Conversation initialized:', data);
    console.log('\n📊 Testing audio streaming events...\n');
    
    // Simulate audio streaming
    testStreamingAudio(socket);
  });

  socket.on('conversation_started', (data: any) => {
    console.log('✅ Conversation started:', data);
  });

  // Listen for audio responses
  socket.on('ai-audio', (data: any) => {
    console.log('🔊 Received AI audio chunk:', {
      type: typeof data,
      size: data.length || data.byteLength || 'unknown',
      isBuffer: Buffer.isBuffer(data),
      isArrayBuffer: data instanceof ArrayBuffer
    });
  });

  socket.on('audio_chunk', (data: any) => {
    console.log('🔊 Received audio_chunk event:', {
      hasData: !!data.data,
      hasTimestamp: !!data.timestamp,
      dataSize: data.data?.byteLength || 'unknown'
    });
  });

  socket.on('transcription', (event: any) => {
    console.log('📝 Transcription:', {
      speaker: event.speaker,
      text: event.text,
      isFinal: event.isFinal
    });
  });

  socket.on('agent_response', (response: any) => {
    console.log('🤖 Agent response:', {
      text: response.text,
      isTentative: response.isTentative
    });
  });

  socket.on('error', (error: any) => {
    console.error('❌ Error:', error);
  });

  socket.on('disconnect', (reason: any) => {
    console.log('🔌 Disconnected:', reason);
  });
}

function testStreamingAudio(socket: any) {
  console.log('🎤 Starting simulated audio streaming...\n');
  
  // Simulate sending audio chunks every 40ms
  let chunkCount = 0;
  const streamInterval = setInterval(() => {
    chunkCount++;
    
    // Create a fake audio chunk (base64 encoded)
    const fakeAudioData = Buffer.alloc(640); // 40ms of 16kHz mono audio
    fakeAudioData.fill(Math.random() * 255);
    const base64Audio = fakeAudioData.toString('base64');
    
    // Send using the mobile guide's event name
    socket.emit('user-audio', { audio: base64Audio });
    
    console.log(`📤 Sent audio chunk #${chunkCount} (${base64Audio.length} bytes base64)`);
    
    // Stop after 2 seconds (50 chunks)
    if (chunkCount >= 50) {
      clearInterval(streamInterval);
      console.log('\n🛑 Stopping audio stream...');
      
      // Send end signal
      socket.emit('user-audio-end');
      console.log('📤 Sent user-audio-end signal\n');
      
      // Test text input after a delay
      setTimeout(() => {
        console.log('💬 Testing text input...');
        socket.emit('send_text', { text: 'Can you summarize what I just said?' });
      }, 2000);
      
      // Disconnect after 10 seconds
      setTimeout(() => {
        console.log('\n👋 Test completed, disconnecting...');
        socket.disconnect();
        process.exit(0);
      }, 10000);
    }
  }, 40);
}

// Run test
if (!AUTH_TOKEN) {
  console.error('❌ TEST_AUTH_TOKEN not set. Please set it in .env');
  process.exit(1);
}

testAudioStreaming().catch(console.error);