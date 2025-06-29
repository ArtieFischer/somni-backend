#!/usr/bin/env ts-node

/**
 * Test script to verify the correct ElevenLabs endpoint and configuration
 */

import WebSocket from 'ws';
import dotenv from 'dotenv';
import { resolve } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: resolve(__dirname, '../../../.env') });

const AGENT_ID = process.env.ELEVENLABS_AGENT_ID_JUNG || 'agent_01jyt0tk6yejm9rbw9hcjrxdht';
const API_KEY = process.env.ELEVENLABS_API_KEY;

if (!API_KEY) {
  console.error('Error: Missing ELEVENLABS_API_KEY');
  process.exit(1);
}

// Test different WebSocket endpoints
const endpoints = [
  {
    name: 'Standard endpoint (with agent_id)',
    url: `wss://api.elevenlabs.io/v1/convai/conversation?agent_id=${AGENT_ID}`,
    headers: { 'Authorization': `Bearer ${API_KEY}` }
  },
  {
    name: 'Standard endpoint (auth header only)',
    url: `wss://api.elevenlabs.io/v1/convai/conversation`,
    headers: { 
      'Authorization': `Bearer ${API_KEY}`,
      'xi-agent-id': AGENT_ID
    }
  },
  {
    name: 'Alternative endpoint',
    url: `wss://api.elevenlabs.io/v1/conversational-ai/conversation?agent_id=${AGENT_ID}`,
    headers: { 'Authorization': `Bearer ${API_KEY}` }
  }
];

async function testEndpoint(config: any) {
  return new Promise((resolve) => {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`Testing: ${config.name}`);
    console.log(`URL: ${config.url}`);
    
    const ws = new WebSocket(config.url, { headers: config.headers });
    let conversationId: string | null = null;
    let clientEvents: string[] = [];
    let timeout: NodeJS.Timeout;
    
    ws.on('open', () => {
      console.log('✅ Connection established');
      
      // Set timeout to close connection after 3 seconds
      timeout = setTimeout(() => {
        console.log('⏱️  Timeout reached, closing connection');
        ws.close();
      }, 3000);
    });
    
    ws.on('message', (data: Buffer) => {
      try {
        const message = JSON.parse(data.toString());
        
        if (message.type === 'conversation_initiation_metadata') {
          const metadata = message.conversation_initiation_metadata_event;
          conversationId = metadata.conversation_id;
          clientEvents = metadata.client_events || [];
          
          console.log('📋 Metadata received:');
          console.log(`  - Conversation ID: ${conversationId}`);
          console.log(`  - Client events: ${JSON.stringify(clientEvents)}`);
          console.log(`  - Has user_transcript: ${clientEvents.includes('user_transcript') ? '✅' : '❌'}`);
          console.log(`  - Has agent_response: ${clientEvents.includes('agent_response') ? '✅' : '❌'}`);
          
          // Send initialization
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
          
          console.log('📤 Sending config override...');
          ws.send(JSON.stringify(initMessage));
        }
      } catch (error) {
        // Binary data
      }
    });
    
    ws.on('error', (error) => {
      console.error('❌ Connection error:', error.message);
      clearTimeout(timeout);
      resolve({ success: false, error: error.message });
    });
    
    ws.on('close', () => {
      clearTimeout(timeout);
      resolve({ 
        success: true, 
        conversationId,
        clientEvents,
        hasTranscripts: clientEvents.includes('user_transcript')
      });
    });
  });
}

async function main() {
  console.log('ElevenLabs Endpoint Configuration Test');
  console.log('======================================');
  console.log(`Agent ID: ${AGENT_ID}`);
  console.log(`API Key: ${API_KEY.substring(0, 10)}...`);
  
  const results = [];
  
  for (const endpoint of endpoints) {
    const result = await testEndpoint(endpoint);
    results.push({ ...endpoint, ...result });
  }
  
  console.log('\n\n📊 Summary:');
  console.log('=' .repeat(60));
  
  for (const result of results) {
    console.log(`\n${result.name}:`);
    console.log(`  Status: ${result.success ? '✅ Connected' : '❌ Failed'}`);
    if (result.success) {
      console.log(`  Has transcripts: ${result.hasTranscripts ? '✅ Yes' : '❌ No'}`);
      console.log(`  Client events: ${JSON.stringify(result.clientEvents || [])}`);
    } else {
      console.log(`  Error: ${result.error}`);
    }
  }
  
  // Recommendation
  console.log('\n\n💡 Recommendation:');
  const workingEndpoint = results.find(r => r.success && r.hasTranscripts);
  if (workingEndpoint) {
    console.log(`Use this endpoint: ${workingEndpoint.url}`);
  } else {
    console.log('No endpoint returned the expected client_events.');
    console.log('The agent configuration may need to be updated at the API level.');
  }
}

main().catch(console.error);