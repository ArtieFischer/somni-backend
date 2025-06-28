# Missing Transcription Issue

## Problem
Sometimes audio recordings don't get transcribed by ElevenLabs, especially for longer recordings with silence.

## Root Causes

### 1. Session Termination Signal
The `terminate_session: true` signal was being sent when user stops recording, which might cancel pending transcriptions.

**Fix**: Changed to send `user_audio_end` instead.

### 2. Long Recordings with Silence
Recordings with many silent chunks might confuse ElevenLabs STT:
- 21-second recording had many "🔇 Skipped silent chunk" entries
- ElevenLabs might timeout or fail to process

### 3. No Transcription Timeout Handling
Backend wasn't tracking if transcriptions were received after sending audio.

**Fix**: Added 10-second timeout to detect missing transcriptions.

## Improvements Made

1. **Better Session End Handling**:
   ```javascript
   // Instead of terminate_session
   this.ws.send(JSON.stringify({
     type: 'user_audio_end'
   }));
   ```

2. **Transcription Timeout Detection**:
   - Set timeout when audio is sent
   - Clear timeout when transcription received
   - Log warning if no transcription within 10s

3. **Enhanced Logging**:
   - Log when user-audio-end is received
   - Log empty transcriptions
   - Track time since last audio

4. **Interim Transcript Support**:
   - Added handler for `user_transcript_interim` events

## Frontend Recommendations

1. **Limit Recording Duration**:
   ```javascript
   const MAX_RECORDING_DURATION = 30000; // 30 seconds
   ```

2. **Implement Voice Activity Detection**:
   - Stop recording after 3 seconds of silence
   - Show visual feedback for voice activity

3. **Better Error Handling**:
   - Show "Processing..." after recording stops
   - Show error if no transcription received

## Backend Monitoring

Look for these logs:
- `"ElevenLabs: No transcription received within timeout"`
- `"ElevenLabs: Received empty user transcript"`
- `"Handling user audio end"`

## Testing
1. Test short recordings (< 5 seconds)
2. Test medium recordings (5-15 seconds)
3. Test long recordings with silence (> 20 seconds)
4. Test rapid start/stop recording