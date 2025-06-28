const io = require('socket.io-client');
import * as dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

async function testFullConversationalFlow() {
  console.log('🚀 Testing full conversational AI flow with database persistence...\n');
  
  try {
    // For this test, you need to:
    // 1. Have a valid user in the database
    // 2. Have a dream with an interpretation
    // 3. Generate a valid JWT token
    
    // Replace these with your actual test data:
    const TEST_TOKEN = process.env.TEST_JWT_TOKEN || '';
    const TEST_DREAM_ID = process.env.TEST_DREAM_ID || '';
    
    if (!TEST_TOKEN || !TEST_DREAM_ID) {
      console.error('❌ Please set TEST_JWT_TOKEN and TEST_DREAM_ID in your .env file');
      console.log('\nTo get these values:');
      console.log('1. Create a user and dream in your database');
      console.log('2. Generate a JWT token for that user');
      console.log('3. Get the dream ID from the dreams table');
      process.exit(1);
    }
    
    // Step 2: Connect to Socket.IO
    console.log('\n2️⃣ Connecting to Socket.IO...');
    const socket = io('http://localhost:3001/conversational-ai', {
      auth: {
        token: TEST_TOKEN
      },
      transports: ['websocket']
    });
    
    // Setup event listeners
    socket.on('connect', () => {
      console.log('✅ Connected to Socket.IO');
      
      // Step 3: Initialize conversation
      console.log('\n3️⃣ Initializing conversation...');
      socket.emit('initialize_conversation', {
        dreamId: TEST_DREAM_ID,
        interpreterId: 'jung' // or 'lakshmi'
      });
    });
    
    socket.on('conversation_initialized', (data: any) => {
      console.log('✅ Conversation initialized:', data);
      
      // Send a test message after a short delay
      setTimeout(() => {
        console.log('\n4️⃣ Sending test message...');
        socket.emit('send_text', {
          text: 'Hello, can you tell me more about the golden field in my dream?'
        });
      }, 2000);
    });
    
    socket.on('conversation_started', (data: any) => {
      console.log('✅ Conversation started:', data);
    });
    
    socket.on('elevenlabs_conversation_initiated', (data: any) => {
      console.log('✅ ElevenLabs session initiated:', data);
    });
    
    socket.on('transcription', (event: any) => {
      console.log(`\n💬 ${event.speaker.toUpperCase()}: ${event.text}`);
    });
    
    socket.on('agent_response', (response: any) => {
      console.log('\n🤖 Agent response received:', response.text?.substring(0, 100) + '...');
    });
    
    socket.on('audio_chunk', (chunk: any) => {
      console.log('🔊 Audio chunk received:', chunk.data?.length || 0, 'bytes');
    });
    
    socket.on('error', (error: any) => {
      console.error('❌ Error:', error);
    });
    
    socket.on('disconnect', () => {
      console.log('\n🔌 Disconnected from Socket.IO');
    });
    
    // Auto-disconnect after 30 seconds
    setTimeout(() => {
      console.log('\n⏰ Test complete, disconnecting...');
      socket.emit('end_conversation');
      socket.disconnect();
      process.exit(0);
    }, 30000);
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

// Run the test
testFullConversationalFlow();