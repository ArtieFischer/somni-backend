# WebSocket Transcript Fix Summary

## Problem Description
Frontend was not receiving `user_transcript` events from the backend, even though audio was being sent and processed by ElevenLabs.

## Root Causes Identified

### 1. Event Name Mismatch
- Backend was emitting events as `transcription`
- Frontend was listening for `user_transcript`
- **Fixed in**: `websocket/conversational-ai-handler.ts:219-240`

### 2. Missing Client Events Configuration
- ElevenLabs was not sending `user_transcript` events because they weren't in the `client_events` list
- For resumed conversations, the original conversation might have been created without proper events
- **Fixed by**: Including `client_events` in every `conversation_config_override`

### 3. Timing Issues
- `user_activity` was being sent too early (500ms after init) which could trigger agent response before user audio
- **Fixed in**: `services/elevenlabs.service.ts:479-494` - Now skips for resumed conversations

## Changes Made

### 1. Backend Event Forwarding
```typescript
// Now emits both event names for compatibility
socket.emit('transcription', event);
if (event.speaker === 'user') {
  socket.emit('user_transcript', {
    text: event.text,
    isFinal: event.isFinal,
    timestamp: event.timestamp || Date.now()
  });
}
```

### 2. Enhanced Error Detection
- Added critical error logging when `user_transcript` is missing from metadata
- Logs raw message content for debugging
- Emits error to frontend when configuration is incorrect

### 3. Configuration Override
Every conversation now includes:
```typescript
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
```

## Permanent Fix: Agent-Level Configuration

The most reliable fix is to configure `client_events` at the agent level in ElevenLabs:

```bash
# Update a specific agent
npx ts-node src/conversational-ai/scripts/update-single-agent.ts <AGENT_ID> <API_KEY>

# Or use the batch script if env vars are set
npx ts-node src/conversational-ai/scripts/update-agent-client-events.ts
```

This ensures every conversation created with that agent will have the proper events.

## Testing the Fix

1. **Check Backend Logs**:
   - Look for "ElevenLabs: Client events configured"
   - Verify it includes `user_transcript`
   - Check for "CRITICAL ERROR" messages about missing events

2. **Check Frontend Logs**:
   - Should receive both `transcription` and `user_transcript` events
   - No more "No transcription received within 15 seconds" warnings

3. **Use Diagnostic Script**:
   ```bash
   npx ts-node src/conversational-ai/scripts/diagnose-websocket-events.ts
   ```
   This connects directly to ElevenLabs and logs all events.

## Frontend Compatibility

The frontend can listen for either event:
- `transcription` - Original event name (still sent)
- `user_transcript` - New event name (now also sent)
- `elevenlabs_transcript_received` - Debug event (also sent)

## Important Notes

1. **Existing conversations** may need to be restarted to pick up the new configuration
2. **New conversations** will work correctly if agent-level config is set
3. **Always verify** the metadata response includes `user_transcript` in `client_events`