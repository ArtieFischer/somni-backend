#!/usr/bin/env ts-node

/**
 * Script to update ElevenLabs agent configuration to include client_events
 * This ensures all conversations inherit the proper event configuration
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

if (!ELEVENLABS_API_KEY) {
  console.error('Error: ELEVENLABS_API_KEY not found in environment variables');
  process.exit(1);
}

// Agent IDs to update
const AGENT_IDS = {
  jung: process.env.ELEVENLABS_AGENT_ID_JUNG,
  lakshmi: process.env.ELEVENLABS_AGENT_ID_LAKSHMI
};

/**
 * Update agent configuration to include client_events
 */
async function updateAgentConfig(agentId: string, agentName: string) {
  if (!agentId) {
    console.error(`Error: Agent ID for ${agentName} not found in environment variables`);
    return;
  }

  const url = `https://api.elevenlabs.io/v1/convai/agents/${agentId}`;
  
  const config = {
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
  
  console.log(`API URL: ${url}`);

  try {
    console.log(`\nUpdating ${agentName} agent (${agentId})...`);
    
    // First, get current configuration
    console.log(`Fetching current configuration...`);
    const getResponse = await axios.get(url, {
      headers: {
        'xi-api-key': ELEVENLABS_API_KEY,
        'Accept': 'application/json'
      }
    });
    
    console.log(`Current client_events for ${agentName}:`, 
      getResponse.data.conversation_config?.conversation?.client_events || 'Not configured');
    
    // Update configuration
    const patchResponse = await axios.patch(url, config, {
      headers: {
        'xi-api-key': ELEVENLABS_API_KEY,
        'Content-Type': 'application/json'
      }
    });
    
    console.log(`✅ Successfully updated ${agentName} agent configuration`);
    console.log(`New client_events:`, config.conversation_config.conversation.client_events);
    
  } catch (error: any) {
    console.error(`❌ Failed to update ${agentName} agent:`, error.response?.data || error.message);
  }
}

/**
 * Main function
 */
async function main() {
  console.log('ElevenLabs Agent Configuration Update');
  console.log('=====================================');
  console.log('This script will update agent configurations to include client_events');
  console.log('This ensures all conversations will receive transcripts and responses\n');

  for (const [name, id] of Object.entries(AGENT_IDS)) {
    if (id) {
      await updateAgentConfig(id, name);
    }
  }

  console.log('\n✅ Configuration update complete!');
  console.log('\nIMPORTANT: All NEW conversations will now receive the proper events.');
  console.log('Existing conversations may need to be restarted to pick up the changes.');
}

// Run the script
main().catch(console.error);