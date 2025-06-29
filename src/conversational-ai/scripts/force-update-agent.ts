#!/usr/bin/env ts-node

/**
 * Force update ElevenLabs agent configuration
 */

import axios from 'axios';
import dotenv from 'dotenv';
import { resolve } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: resolve(__dirname, '../../../.env') });

const AGENT_ID = process.env.ELEVENLABS_AGENT_ID_JUNG;
const API_KEY = process.env.ELEVENLABS_API_KEY;

if (!AGENT_ID || !API_KEY) {
  console.error('Missing required environment variables');
  process.exit(1);
}

async function forceUpdateAgent() {
  const url = `https://api.elevenlabs.io/v1/convai/agents/${AGENT_ID}`;
  
  console.log('Force Update Agent Configuration');
  console.log('================================');
  console.log(`Agent ID: ${AGENT_ID}`);
  console.log(`API URL: ${url}`);
  
  try {
    // First, get current configuration
    console.log('\n1. Fetching current configuration...');
    const getResponse = await axios.get(url, {
      headers: {
        'xi-api-key': API_KEY,
        'Accept': 'application/json'
      }
    });
    
    console.log('Current conversation config:');
    console.log(JSON.stringify(getResponse.data.conversation_config?.conversation || {}, null, 2));
    
    // Prepare the update - merge with existing config
    const currentConfig = getResponse.data.conversation_config || {};
    const updatedConfig = {
      ...currentConfig,
      conversation: {
        ...currentConfig.conversation,
        client_events: [
          'audio',
          'user_transcript',
          'agent_response',
          'agent_response_correction',
          'conversation_initiation_metadata',
          'vad_score',
          'interruption'
        ]
      }
    };
    
    console.log('\n2. Applying updated configuration...');
    const patchResponse = await axios.patch(url, {
      conversation_config: updatedConfig
    }, {
      headers: {
        'xi-api-key': API_KEY,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Update successful');
    
    // Verify the update
    console.log('\n3. Verifying update...');
    const verifyResponse = await axios.get(url, {
      headers: {
        'xi-api-key': API_KEY,
        'Accept': 'application/json'
      }
    });
    
    const newClientEvents = verifyResponse.data.conversation_config?.conversation?.client_events || [];
    console.log('New client_events:', JSON.stringify(newClientEvents, null, 2));
    
    console.log('\nVerification:');
    console.log('- user_transcript:', newClientEvents.includes('user_transcript') ? '✅' : '❌');
    console.log('- agent_response:', newClientEvents.includes('agent_response') ? '✅' : '❌');
    
    // Test WebSocket connection
    console.log('\n4. Testing WebSocket connection...');
    const WebSocket = (await import('ws')).default;
    const wsUrl = `wss://api.elevenlabs.io/v1/convai/conversation?agent_id=${AGENT_ID}`;
    const ws = new WebSocket(wsUrl, {
      headers: { 'Authorization': `Bearer ${API_KEY}` }
    });
    
    await new Promise((resolve) => {
      ws.on('open', () => {
        console.log('✅ WebSocket connected');
      });
      
      ws.on('message', (data: Buffer) => {
        try {
          const message = JSON.parse(data.toString());
          if (message.type === 'conversation_initiation_metadata') {
            const metadata = message.conversation_initiation_metadata_event;
            const wsClientEvents = metadata.client_events || [];
            console.log('\nWebSocket client_events:', JSON.stringify(wsClientEvents, null, 2));
            console.log('WebSocket has user_transcript:', wsClientEvents.includes('user_transcript') ? '✅' : '❌');
            ws.close();
            resolve(true);
          }
        } catch (e) {}
      });
      
      ws.on('error', (error) => {
        console.error('WebSocket error:', error.message);
        resolve(false);
      });
      
      setTimeout(() => {
        ws.close();
        resolve(false);
      }, 5000);
    });
    
  } catch (error: any) {
    console.error('❌ Error:', error.response?.data || error.message);
    if (error.response?.data) {
      console.error('Response details:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

forceUpdateAgent().catch(console.error);