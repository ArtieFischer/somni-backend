#!/usr/bin/env ts-node

/**
 * Diagnostic script to connect directly to ElevenLabs WebSocket and log all events
 * This helps diagnose why transcripts aren't being received
 */

import WebSocket from 'ws';
import dotenv from 'dotenv';
import { resolve } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { writeFileSync } from 'fs';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: resolve(__dirname, '../../../.env') });

const AGENT_ID = process.env.ELEVENLABS_AGENT_ID_JUNG || 'agent_01jyt0tk6yejm9rbw9hcjrxdht';
const API_KEY = process.env.ELEVENLABS_API_KEY;

if (!AGENT_ID || !API_KEY) {
  console.error('Error: Missing ELEVENLABS_JUNG_AGENT_ID or ELEVENLABS_API_KEY');
  process.exit(1);
}

const wsUrl = `wss://api.elevenlabs.io/v1/convai/conversation?agent_id=${AGENT_ID}`;

console.log('ElevenLabs WebSocket Event Diagnostic');
console.log('=====================================');
console.log(`Connecting to agent: ${AGENT_ID}`);
console.log(`WebSocket URL: ${wsUrl}\n`);

const ws = new WebSocket(wsUrl, {
  headers: {
    'Authorization': `Bearer ${API_KEY}`
  }
});

let conversationId: string | null = null;
const messageLog: any[] = [];

ws.on('open', () => {
  console.log('✅ WebSocket connected\n');
});

ws.on('message', (data: Buffer) => {
  try {
    const message = JSON.parse(data.toString());
    const timestamp = new Date().toISOString();
    
    messageLog.push({ timestamp, message });
    
    console.log(`[${timestamp}] Message type: ${message.type}`);
    
    switch (message.type) {
      case 'conversation_initiation_metadata':
        const metadata = message.conversation_initiation_metadata_event;
        conversationId = metadata.conversation_id;
        
        console.log('📋 Conversation Metadata:');
        console.log(`  - Conversation ID: ${conversationId}`);
        console.log(`  - Audio format: ${metadata.audio_format || 'Not specified'}`);
        console.log(`  - Client events: ${JSON.stringify(metadata.client_events || [])}`);
        
        if (!metadata.client_events?.includes('user_transcript')) {
          console.log('  ⚠️  WARNING: user_transcript NOT in client_events!');
        }
        if (!metadata.client_events?.includes('agent_response')) {
          console.log('  ⚠️  WARNING: agent_response NOT in client_events!');
        }
        
        // Send initialization with client_events override
        console.log('\n📤 Sending conversation_initiation_client_data with client_events override...');
        
        const initMessage = {
          type: 'conversation_initiation_client_data',
          dynamic_variables: {
            user_name: 'Test User',
            age: 30,
            dream_topic: 'Test Dream',
            dreamContent: 'This is a test dream for diagnostic purposes'
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
        console.log('✅ Sent initialization with client_events:', 
          initMessage.conversation_config_override.conversation.client_events);
        
        // Send test audio after a delay
        setTimeout(() => {
          console.log('\n📤 Sending test audio (silence)...');
          
          // First send user_message_begin
          ws.send(JSON.stringify({ type: 'user_message_begin' }));
          
          // Send some silence as base64
          const silenceBuffer = Buffer.alloc(16000); // 1 second of silence at 16kHz
          const base64Audio = silenceBuffer.toString('base64');
          
          ws.send(JSON.stringify({
            type: 'user_audio_chunk',
            user_audio_chunk: base64Audio
          }));
          
          // End audio
          setTimeout(() => {
            console.log('📤 Sending end_user_audio...');
            ws.send(JSON.stringify({ type: 'end_user_audio' }));
            
            // Wait for transcript
            setTimeout(() => {
              console.log('\n📊 Summary after 5 seconds:');
              const transcriptMessages = messageLog.filter(m => 
                m.message.type === 'user_transcript' || 
                m.message.type === 'user_transcription'
              );
              
              if (transcriptMessages.length === 0) {
                console.log('❌ NO TRANSCRIPT MESSAGES RECEIVED');
                console.log('\nAll message types received:');
                const types = [...new Set(messageLog.map(m => m.message.type))];
                types.forEach(type => {
                  const count = messageLog.filter(m => m.message.type === type).length;
                  console.log(`  - ${type}: ${count} messages`);
                });
              } else {
                console.log('✅ Transcript messages received:', transcriptMessages.length);
                transcriptMessages.forEach(m => {
                  console.log(`  - ${m.message.type}: "${m.message.user_transcript || m.message.text}"`);
                });
              }
              
              console.log('\n📝 Full message log saved to diagnostic-log.json');
              writeFileSync(
                'diagnostic-log.json', 
                JSON.stringify(messageLog, null, 2)
              );
              
              process.exit(0);
            }, 5000);
          }, 1000);
        }, 2000);
        break;
        
      case 'user_transcript':
        console.log(`✅ USER TRANSCRIPT: "${message.user_transcription_event?.user_transcript}"`);
        break;
        
      case 'agent_response':
        console.log(`🤖 Agent response: "${message.agent_response_event?.agent_response}"`);
        break;
        
      case 'audio':
        console.log('🔊 Audio event received');
        break;
        
      default:
        console.log(`  Details: ${JSON.stringify(message).substring(0, 200)}...`);
    }
    
  } catch (error) {
    // Binary audio data
    console.log(`[${new Date().toISOString()}] Binary audio data (${data.length} bytes)`);
  }
});

ws.on('error', (error) => {
  console.error('❌ WebSocket error:', error);
});

ws.on('close', (code, reason) => {
  console.log(`\n🔌 WebSocket closed: ${code} - ${reason}`);
  process.exit(0);
});

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\nShutting down...');
  ws.close();
  process.exit(0);
});