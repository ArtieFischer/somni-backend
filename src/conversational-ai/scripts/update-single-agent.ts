#!/usr/bin/env ts-node

/**
 * Script to update a single ElevenLabs agent configuration to include client_events
 * Usage: npx ts-node update-single-agent.ts <AGENT_ID> <API_KEY>
 */

import axios from 'axios';

const args = process.argv.slice(2);

if (args.length < 2) {
  console.error('Usage: npx ts-node update-single-agent.ts <AGENT_ID> <API_KEY>');
  console.error('Example: npx ts-node update-single-agent.ts abc123 xi-api-key-here');
  process.exit(1);
}

const [agentId, apiKey] = args;

async function updateAgentConfig() {
  const url = `https://api.elevenlabs.io/v1/agents/${agentId}`;
  
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

  try {
    console.log(`\nUpdating agent ${agentId}...`);
    
    // First, get current configuration
    console.log('Fetching current configuration...');
    const getResponse = await axios.get(url, {
      headers: {
        'xi-api-key': apiKey
      }
    });
    
    const currentEvents = getResponse.data.conversation_config?.conversation?.client_events;
    console.log('Current client_events:', currentEvents || 'Not configured');
    
    if (currentEvents?.includes('user_transcript') && currentEvents?.includes('agent_response')) {
      console.log('✅ Agent already has the required events configured!');
      return;
    }
    
    // Update configuration
    console.log('\nUpdating configuration...');
    const patchResponse = await axios.patch(url, config, {
      headers: {
        'xi-api-key': apiKey,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Successfully updated agent configuration');
    console.log('New client_events:', config.conversation_config.conversation.client_events);
    
    // Verify the update
    console.log('\nVerifying update...');
    const verifyResponse = await axios.get(url, {
      headers: {
        'xi-api-key': apiKey
      }
    });
    
    const updatedEvents = verifyResponse.data.conversation_config?.conversation?.client_events;
    if (updatedEvents?.includes('user_transcript') && updatedEvents?.includes('agent_response')) {
      console.log('✅ Verification successful - events are properly configured');
    } else {
      console.log('⚠️  Warning: Verification shows events may not be properly set');
      console.log('Received:', updatedEvents);
    }
    
  } catch (error: any) {
    console.error('❌ Failed to update agent:', error.response?.data || error.message);
    if (error.response?.status === 404) {
      console.error('Agent not found. Please check the agent ID.');
    } else if (error.response?.status === 401) {
      console.error('Authentication failed. Please check the API key.');
    }
  }
}

updateAgentConfig().catch(console.error);