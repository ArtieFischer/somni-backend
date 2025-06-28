# Missing Transcription Issue

## Problem
Sometimes audio recordings don't get transcribed by ElevenLabs, especially for longer recordings with silence.

## Root Causes

### 1. Session Termination Signal
The `terminate_session: true` signal was being sent when user stops recording, which might cancel pending transcriptions.

**Fix**: Don't send any termination signal, let ElevenLabs process the audio naturally.

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
   // Don't send any termination signal
   // Just update activity time
   this.lastActivityTime = Date.now();
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

1. **Configure ElevenLabs Agent**:
   - In ElevenLabs Dashboard → Agent → Advanced → Turn Timeout
   - Set to **30 seconds** (maximum) for thoughtful conversations

2. **Send Activity Signals During Silence**:
   ```javascript
   // Every 8 seconds during recording, if silent
   if (isRecording && vadScore < 0.3) {
     socket.emit('user_activity_signal');
   }
   ```

3. **Visual Feedback**:
   - Show "Listening..." when VAD score > 0.3
   - Show "Take your time..." when VAD score < 0.3
   - Show "Processing..." after recording stops

4. **Smart Recording**:
   ```javascript
   // Don't auto-stop on silence - let user control
   // Or use long silence threshold (10+ seconds)
   const SILENCE_BEFORE_STOP = 10000; // 10 seconds
   ```

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