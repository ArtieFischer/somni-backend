#!/usr/bin/env ts-node

/**
 * Test sending configuration immediately upon WebSocket connection
 */

import WebSocket from 'ws';
import dotenv from 'dotenv';
import { resolve } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: resolve(__dirname, '../../../.env') });

const AGENT_ID = process.env.ELEVENLABS_AGENT_ID_JUNG;
const API_KEY = process.env.ELEVENLABS_API_KEY;

if (!AGENT_ID || !API_KEY) {
  console.error('Missing required environment variables');
  process.exit(1);
}

console.log('Testing Immediate Configuration Send');
console.log('====================================');

const wsUrl = `wss://api.elevenlabs.io/v1/convai/conversation?agent_id=${AGENT_ID}`;
const ws = new WebSocket(wsUrl, {
  headers: { 'Authorization': `Bearer ${API_KEY}` }
});

let metadataReceived = false;
const messages: any[] = [];

ws.on('open', () => {
  console.log('✅ WebSocket connected');
  console.log('📤 Sending configuration IMMEDIATELY (before metadata)...');
  
  // Try sending config immediately
  const initMessage = {
    type: 'conversation_initiation_client_data',
    dynamic_variables: {
      user_name: 'Test User',
      age: 30,
      dream_topic: 'Test Dream'
    },
    conversation_config_override: {
      conversation: {
        client_events: [
          'audio',
          'user_transcript',
          'agent_response',
          'agent_response_correction',
          'conversation_initiation_metadata'
        ]
      }
    }
  };
  
  ws.send(JSON.stringify(initMessage));
  console.log('✅ Configuration sent');
});

ws.on('message', (data: Buffer) => {
  try {
    const message = JSON.parse(data.toString());
    messages.push(message);
    
    console.log(`\n📨 Received: ${message.type}`);
    
    if (message.type === 'conversation_initiation_metadata') {
      metadataReceived = true;
      const metadata = message.conversation_initiation_metadata_event;
      const clientEvents = metadata.client_events || [];
      
      console.log('📋 Metadata:');
      console.log(`  - Conversation ID: ${metadata.conversation_id}`);
      console.log(`  - Client events: ${JSON.stringify(clientEvents)}`);
      console.log(`  - Has user_transcript: ${clientEvents.includes('user_transcript') ? '✅' : '❌'}`);
      
      if (!clientEvents.includes('user_transcript')) {
        console.log('\n🔄 Trying to send config again after metadata...');
        const retryMessage = {
          type: 'conversation_config_update',
          conversation_config: {
            conversation: {
              client_events: [
                'audio',
                'user_transcript',
                'agent_response',
                'agent_response_correction',
                'conversation_initiation_metadata'
              ]
            }
          }
        };
        ws.send(JSON.stringify(retryMessage));
      }
      
      // Send test message
      setTimeout(() => {
        console.log('\n📤 Sending test text message...');
        ws.send(JSON.stringify({
          type: 'user_message',
          user_message: 'Hello, this is a test message'
        }));
      }, 1000);
      
      // Close after 5 seconds
      setTimeout(() => {
        console.log('\n📊 Final message summary:');
        const messageTypes = [...new Set(messages.map(m => m.type))];
        messageTypes.forEach(type => {
          const count = messages.filter(m => m.type === type).length;
          console.log(`  - ${type}: ${count}`);
        });
        
        const transcriptMessages = messages.filter(m => 
          m.type === 'user_transcript' || 
          m.type === 'user_transcription'
        );
        console.log(`\nTranscript messages received: ${transcriptMessages.length}`);
        
        ws.close();
      }, 5000);
    }
    
    if (message.type === 'user_transcript') {
      console.log(`✅ USER TRANSCRIPT RECEIVED: "${message.user_transcription_event?.user_transcript}"`);
    }
    
    if (message.type === 'error') {
      console.error('❌ Error from ElevenLabs:', message);
    }
    
  } catch (error) {
    // Binary data
  }
});

ws.on('error', (error) => {
  console.error('❌ WebSocket error:', error);
});

ws.on('close', (code, reason) => {
  console.log(`\n🔌 WebSocket closed: ${code} - ${reason}`);
  
  if (!metadataReceived) {
    console.log('⚠️  Connection closed before receiving metadata');
  }
});