#!/usr/bin/env ts-node

/**
 * Script to check ElevenLabs agent details and current configuration
 */

import axios from 'axios';
import dotenv from 'dotenv';
import { resolve } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: resolve(__dirname, '../../../.env') });

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const AGENT_ID = process.env.ELEVENLABS_AGENT_ID_JUNG || process.argv[2];

if (!ELEVENLABS_API_KEY) {
  console.error('Error: ELEVENLABS_API_KEY not found in environment variables');
  process.exit(1);
}

if (!AGENT_ID) {
  console.error('Error: No agent ID provided. Use: npx ts-node check-agent-details.ts <AGENT_ID>');
  process.exit(1);
}

async function checkAgent() {
  console.log('ElevenLabs Agent Details Check');
  console.log('==============================');
  console.log(`Agent ID: ${AGENT_ID}`);
  console.log(`API Key: ${ELEVENLABS_API_KEY.substring(0, 10)}...`);
  
  // Try different API endpoints
  const endpoints = [
    `https://api.elevenlabs.io/v1/convai/agents/${AGENT_ID}`,
    `https://api.elevenlabs.io/v1/agents/${AGENT_ID}`,
    `https://api.elevenlabs.io/v1/conversational-ai/agents/${AGENT_ID}`
  ];
  
  for (const url of endpoints) {
    console.log(`\nTrying endpoint: ${url}`);
    
    try {
      const response = await axios.get(url, {
        headers: {
          'xi-api-key': ELEVENLABS_API_KEY,
          'Accept': 'application/json'
        }
      });
      
      console.log('✅ Success! Agent found.');
      console.log('\nAgent Details:');
      console.log('- Name:', response.data.name || 'Not set');
      console.log('- Agent ID:', response.data.agent_id || AGENT_ID);
      
      const clientEvents = response.data.conversation_config?.conversation?.client_events;
      console.log('\nCurrent client_events configuration:');
      if (clientEvents) {
        console.log(JSON.stringify(clientEvents, null, 2));
        console.log('\nRequired events present:');
        console.log('- user_transcript:', clientEvents.includes('user_transcript') ? '✅' : '❌');
        console.log('- agent_response:', clientEvents.includes('agent_response') ? '✅' : '❌');
      } else {
        console.log('❌ No client_events configured');
      }
      
      // Show full conversation config
      console.log('\nFull conversation config:');
      console.log(JSON.stringify(response.data.conversation_config || {}, null, 2));
      
      return true;
    } catch (error: any) {
      if (error.response?.status === 404) {
        console.log('❌ 404 Not Found');
      } else if (error.response?.status === 401) {
        console.log('❌ 401 Unauthorized - Check API key');
      } else {
        console.log('❌ Error:', error.response?.status || error.message);
      }
    }
  }
  
  console.log('\n❌ Could not find agent with any of the tried endpoints.');
  console.log('\nPossible issues:');
  console.log('1. Agent ID is incorrect');
  console.log('2. API key doesn\'t have access to this agent');
  console.log('3. Agent has been deleted');
  
  return false;
}

checkAgent().catch(console.error);