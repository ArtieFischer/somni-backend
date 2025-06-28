# Audio Streaming Deployment Requirements

## Critical: Backend Not Receiving Audio

Based on the logs, the frontend is sending audio but the backend is NOT receiving it. This indicates:

1. **The production backend doesn't have the latest code**
2. **OR the frontend is using different event names**

## What Needs to be Deployed

### 1. Updated WebSocket Handler (`conversational-ai-handler.ts`)
- Added logging for all audio events
- Support for `send_audio`, `user-audio`, and `audio_chunk` events
- Support for `user-audio-end` event
- Enhanced audio format handling

### 2. Updated ElevenLabs Service (`elevenlabs.service.ts`)
- Support for base64 string audio input
- Added `sendSessionTermination()` method
- Enhanced logging for audio flow
- Binary audio chunk handling

### 3. Key Event Names the Backend Now Supports
- `send_audio` - Primary audio chunk event
- `user-audio` - Alternative audio chunk event
- `user-audio-end` - End of recording signal
- `audio_chunk` - Legacy audio chunk event

## Debugging Steps After Deployment

1. **Check Event Names**: The new logging will show exactly what events the frontend is sending
2. **Verify Audio Reception**: Look for "Received audio chunk from client" logs
3. **Monitor ElevenLabs Forward**: Look for "Sending base64 audio to ElevenLabs" logs

## Frontend Issues to Address

1. **Mode Confusion**: The app shows "mode": "voice" but also "Cannot start audio recording in text mode"
2. **Event Names**: Need to confirm frontend is using `send_audio` event (or adapt backend to match)

## Temporary Workaround

If you can't deploy immediately, the frontend could switch to text mode as a fallback since that appears to be partially working.

## Required Environment Variables

Ensure production has:
- `ELEVENLABS_API_KEY`
- `ELEVENLABS_AGENT_ID_JUNG`
- `ELEVENLABS_AGENT_ID_LAKSHMI`