# Transcript Debugging Guide

## Current Status

### ✅ What's Working:
1. **Agent Configuration**: The Jung agent has `user_transcript` in its `client_events` list
2. **Backend Configuration**: The backend sends the correct `conversation_config_override` with all required events
3. **Event Forwarding**: Backend now emits both `transcription` and `user_transcript` events
4. **Audio Flow**: Audio is being sent to ElevenLabs and agent responses are received

### ❌ What's Not Working:
1. ElevenLabs is not sending `user_transcript` events back to the backend
2. Frontend waits for transcripts that never arrive

## Possible Causes

### 1. Audio Quality Issues
- The audio might be too quiet or contain too much silence
- ElevenLabs ASR might not detect speech in the audio
- Audio format might be incorrect (should be PCM 16kHz)

### 2. Timing Issues
- The `user_activity` message sent 500ms after init might interfere
- Audio might be sent before the configuration is fully processed
- The `end_user_audio` signal might be sent too early

### 3. Session State Issues
- For resumed conversations, the original session might have different settings
- The WebSocket might be reconnecting and losing configuration

## Debugging Steps

### 1. Check Backend Logs for Critical Errors
Look for:
```
"CRITICAL ERROR - user_transcript not in client_events!"
```
This indicates ElevenLabs didn't accept the configuration.

### 2. Check Audio Quality
In the backend logs, look for:
- `audioChunksSent` - Should be > 0
- `totalBytesSent` - Should be substantial (> 10KB for a few seconds)
- `estimatedAudioDuration` - Should match actual recording time

### 3. Test with Fresh Conversation
Instead of resuming, start a completely new conversation to rule out session state issues.

### 4. Monitor Raw ElevenLabs Messages
Look for log entries with:
```
"ElevenLabs: Received message"
```
Check if any have `type: "user_transcript"`

### 5. Use the Diagnostic Script
```bash
# Set your API key first
export ELEVENLABS_API_KEY=your_key_here

# Run diagnostic
npx ts-node src/conversational-ai/scripts/diagnose-websocket-events.ts
```

This will:
- Connect directly to ElevenLabs
- Send test audio
- Show exactly what events are received

## Quick Fixes to Try

### 1. Increase Audio Volume
Ensure the frontend is sending audio with sufficient volume. Silent or very quiet audio won't trigger ASR.

### 2. Add Debug Audio Logging
In the frontend, log:
- Audio buffer size before sending
- Actual audio levels (RMS or peak)
- Recording duration

### 3. Test with Known Good Audio
Send a pre-recorded audio file that you know contains clear speech.

### 4. Force New Conversation
Add a flag to force creating a new conversation instead of resuming:
```typescript
// In conversational-ai-handler.ts
const forceNew = data.forceNewConversation || false;
if (forceNew) {
  // Create new conversation instead of resuming
}
```

## Backend Verification Checklist

- [ ] Backend receives audio chunks from frontend
- [ ] Audio chunks are forwarded to ElevenLabs
- [ ] `end_user_audio` is sent after audio stops
- [ ] No errors in ElevenLabs WebSocket connection
- [ ] `conversation_initiation_metadata` shows correct `client_events`
- [ ] No timeout errors before transcript should arrive

## Frontend Verification Checklist

- [ ] Audio recording captures actual sound (not silence)
- [ ] Audio is sent as base64 PCM 16kHz
- [ ] `user-audio-start` is sent before audio
- [ ] `user-audio-end` is sent after audio
- [ ] Frontend waits at least 5 seconds for transcript

## If All Else Fails

1. **Contact ElevenLabs Support** with:
   - Agent ID
   - Conversation ID from logs
   - Timestamp of failed transcript
   
2. **Try Different ASR Settings**:
   - Change ASR quality in agent config
   - Try different ASR provider
   
3. **Implement Fallback**:
   - Use REST API to fetch transcript if WebSocket fails
   - Add manual retry mechanism