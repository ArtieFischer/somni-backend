import WebSocket from 'ws';
import * as dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

const AGENT_ID = process.env.ELEVENLABS_AGENT_ID_JUNG || 'agent_01jyt0tk6yejm9rbw9hcjrxdht';
const API_KEY = process.env.ELEVENLABS_API_KEY;

if (!API_KEY) {
  console.error('ELEVENLABS_API_KEY not found in environment');
  process.exit(1);
}

console.log('Testing direct connection to ElevenLabs WebSocket...');
console.log('Agent ID:', AGENT_ID);

const wsUrl = `wss://api.elevenlabs.io/v1/convai/conversation?agent_id=${AGENT_ID}`;
const ws = new WebSocket(wsUrl);

let conversationReady = false;

ws.on('open', () => {
  console.log('✅ WebSocket connected');
  // Don't send anything yet, wait for metadata
});

ws.on('message', (data: Buffer) => {
  try {
    const message = JSON.parse(data.toString());
    console.log('\n📨 Received message:', JSON.stringify(message, null, 2));
    
    if (message.type === 'conversation_initiation_metadata') {
      console.log('\n✅ Got metadata, sending initialization...');
      conversationReady = true;
      
      // Send initialization with dynamic variables
      const initMessage = {
        type: 'conversation_initiation_client_data',
        dynamic_variables: {
          user_name: 'Test User',
          age: 30,
          dream_topic: 'Flying Dream',
          dreamContent: 'I was flying over mountains',
          emotionalToneprimary: 'joy',
          emotionalToneintensity: 0.8
        }
      };
      
      console.log('\n📤 Sending:', JSON.stringify(initMessage, null, 2));
      ws.send(JSON.stringify(initMessage));
    }
    
    if (message.type === 'agent_response') {
      console.log('\n🎉 Agent responded:', message.agent_response_event.agent_response);
    }
    
    if (message.type === 'error') {
      console.error('\n❌ Error from ElevenLabs:', message);
    }
  } catch (error) {
    // Might be audio data
    console.log('📦 Received binary data (audio):', data.length, 'bytes');
  }
});

ws.on('error', (error) => {
  console.error('❌ WebSocket error:', error);
});

ws.on('close', (code, reason) => {
  console.log('\n🔌 WebSocket closed');
  console.log('Code:', code);
  console.log('Reason:', reason?.toString() || 'No reason provided');
  process.exit(0);
});

// Send a test message after 5 seconds
setTimeout(() => {
  if (conversationReady) {
    console.log('\n📤 Sending test message...');
    ws.send(JSON.stringify({
      type: 'user_message',
      text: 'Hello, can you hear me?'
    }));
  }
}, 5000);

// Close after 30 seconds
setTimeout(() => {
  console.log('\n⏰ Closing connection...');
  ws.close();
}, 30000);