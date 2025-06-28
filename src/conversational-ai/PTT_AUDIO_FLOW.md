# Push-to-Talk (PTT) Audio Flow for ElevenLabs

## Key Insight
ElevenLabs does **NOT** require continuous audio streaming for Push-to-Talk mode. You just need to properly signal the boundaries.

## Correct PTT Flow

### 1. When User Starts Recording
```javascript
// Optional but recommended
socket.emit('user-audio-start');
```

Backend sends:
```json
{ "type": "user_message_begin" }
```

### 2. During Recording
```javascript
// Send audio chunks as they come
socket.emit('send_audio', { 
  audio: base64AudioChunk 
});
```

Backend forwards:
```json
{ "user_audio_chunk": "base64EncodedAudio" }
```

### 3. When User Stops Recording
```javascript
// Send end signal immediately
socket.emit('user-audio-end');
```

Backend sends:
```json
{ "type": "end_user_audio" }
```

## What NOT to Do
- ❌ Don't send silence chunks after recording stops
- ❌ Don't wait before sending `end_user_audio`
- ❌ Don't send empty audio chunks
- ❌ Don't use `terminate_session`

## Frontend Implementation

### Correct Approach
```javascript
class PTTRecorder {
  async startRecording() {
    // 1. Notify backend recording started
    socket.emit('user-audio-start');
    
    // 2. Start actual recording
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: true,
      playsInSilentModeIOS: true,
    });
    
    this.recording = new Audio.Recording();
    await this.recording.prepareToRecordAsync(RECORDING_OPTIONS);
    await this.recording.startAsync();
    
    // 3. Stream audio chunks
    this.recording.setOnRecordingStatusUpdate((status) => {
      if (status.isRecording && status.uri) {
        // Process and send chunks
      }
    });
  }

  async stopRecording() {
    // 1. Stop recording
    await this.recording.stopAndUnloadAsync();
    
    // 2. Send final audio if any
    if (this.pendingAudioBuffer.length > 0) {
      socket.emit('send_audio', { 
        audio: this.pendingAudioBuffer 
      });
    }
    
    // 3. Send end signal IMMEDIATELY
    socket.emit('user-audio-end');
    
    // That's it! No silence, no delays
  }
}
```

## Keeping Connection Alive

For multiple PTT sessions without reconnecting:

### Option 1: Extend Inactivity Timeout
```javascript
// In WebSocket URL
const wsUrl = `wss://api.elevenlabs.io/v1/convai/conversation?agent_id=${agentId}&inactivity_timeout=180`;
```

### Option 2: Send Keep-Alive Pings
```javascript
// Every 15 seconds when idle
setInterval(() => {
  if (!isRecording) {
    socket.emit('user_activity_signal');
  }
}, 15000);
```

Backend sends a single space:
```json
{ "text": " " }
```

## Why Previous Approach Failed

1. We were NOT sending `end_user_audio`
2. We were trying to send silence (unnecessary for PTT)
3. ElevenLabs was waiting for the proper boundary signal

## Testing Checklist

- [ ] Start recording → `user-audio-start` sent
- [ ] Audio chunks sent during recording
- [ ] Stop recording → `user-audio-end` sent immediately
- [ ] Transcription received within 1-2 seconds
- [ ] No silence chunks sent
- [ ] Connection stays alive between recordings

## Summary

For Push-to-Talk:
1. Send `user_message_begin` when starting (optional)
2. Stream audio chunks while recording
3. Send `end_user_audio` immediately when done
4. Keep connection alive with timeouts or pings

That's it! No continuous streaming needed.