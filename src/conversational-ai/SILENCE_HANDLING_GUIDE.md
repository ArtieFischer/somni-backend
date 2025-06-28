# Silence Handling Guide for ElevenLabs Conversational AI

## Overview
ElevenLabs has sophisticated Voice Activity Detection (VAD) and turn-taking logic that needs proper configuration for users who need time to think.

## How ElevenLabs Handles Silence

1. **VAD (Voice Activity Detection)**:
   - Continuously monitors for speech vs silence
   - Sends `vad_score` events (0.0 to 1.0)
   - Doesn't trigger turn-end on brief pauses between words

2. **Turn Timeout**:
   - Configured in ElevenLabs Dashboard (Agent → Advanced → Turn Timeout)
   - Range: 1-30 seconds
   - Default might be too short for thoughtful responses

3. **Silence Optimization**:
   - After 10 seconds of silence, reduces processing
   - Charges only 5% of normal rate during extended silence
   - Automatically resumes when voice detected

## Configuration Steps

### 1. ElevenLabs Dashboard Settings
In your agent's Advanced settings:
```
Turn Timeout: 30 seconds (maximum)
```
This gives users the most time to think.

### 2. Frontend Improvements

#### A. Visual Feedback During Silence
```javascript
// Show thinking indicator after 2 seconds of silence
if (silenceDuration > 2000 && isRecording) {
  showThinkingIndicator();
}
```

#### B. Send Activity Signals
```javascript
// During recording, periodically send activity signal
recordingInterval = setInterval(() => {
  if (isRecording && !isSpeaking) {
    socket.emit('user_activity_signal');
  }
}, 5000); // Every 5 seconds
```

### 3. Backend Handling

#### A. Forward Activity Signals
```javascript
socket.on('user_activity_signal', () => {
  const elevenLabsService = (socket.agent as any).elevenLabsService;
  if (elevenLabsService?.isActive()) {
    // Send user_activity to prevent timeout
    elevenLabsService.sendUserActivity();
  }
});
```

#### B. Monitor VAD Scores
```javascript
elevenLabsService.on('vad_score', (data) => {
  const { score } = data;
  
  // Low score = silence/no speech
  if (score < 0.3) {
    // User is silent, might be thinking
    socket.emit('user_silent', { vadScore: score });
  } else {
    // User is speaking
    socket.emit('user_speaking', { vadScore: score });
  }
});
```

## Implementation Example

### Backend: Add User Activity Method
```typescript
// In elevenlabs.service.ts
sendUserActivity(): void {
  if (!this.isConnected || !this.ws) {
    return;
  }
  
  this.ws.send(JSON.stringify({
    type: 'user_activity'
  }));
  
  this.lastActivityTime = Date.now();
}
```

### Frontend: Smart Silence Detection
```javascript
let silenceTimer = null;
let activityInterval = null;

function startRecording() {
  // ... start recording code ...
  
  // Monitor for extended silence
  activityInterval = setInterval(() => {
    if (isRecording && currentVADScore < 0.3) {
      // User is thinking, keep session active
      socket.emit('user_activity_signal');
    }
  }, 8000); // Every 8 seconds
}

function stopRecording() {
  clearInterval(activityInterval);
  // ... stop recording code ...
}
```

## Best Practices

1. **Set Maximum Turn Timeout (30s)** in ElevenLabs Dashboard
2. **Provide Visual Feedback** when user is silent but recording
3. **Send Activity Signals** during long silences to prevent timeout
4. **Monitor VAD Scores** to distinguish thinking from speaking
5. **Don't Send audio_end** immediately - let user think

## Troubleshooting

### Issue: Transcription cuts off during pauses
**Solution**: Increase turn timeout in dashboard, send activity signals

### Issue: Session times out during thinking
**Solution**: Send `user_activity` messages every 5-8 seconds during silence

### Issue: Multiple transcriptions for one recording
**Solution**: Don't send `terminate_session`, let ElevenLabs handle turn-end naturally

## Alternative: Silence-Aware Recording

Instead of continuous recording, implement push-to-talk or silence detection:

```javascript
// Stop recording after N seconds of silence
let silenceTimeout;
const SILENCE_THRESHOLD = 3000; // 3 seconds

function onVADScore(score) {
  if (score < 0.3) {
    // Start silence timer
    if (!silenceTimeout && isRecording) {
      silenceTimeout = setTimeout(() => {
        // Auto-stop after extended silence
        stopRecording();
      }, SILENCE_THRESHOLD);
    }
  } else {
    // Cancel silence timer if speaking
    if (silenceTimeout) {
      clearTimeout(silenceTimeout);
      silenceTimeout = null;
    }
  }
}
```

## Summary

For users who need time to think:
1. Configure 30-second turn timeout in ElevenLabs Dashboard
2. Send periodic `user_activity` signals during silence
3. Use VAD scores to provide UI feedback
4. Don't terminate sessions prematurely
5. Consider implementing smart silence detection