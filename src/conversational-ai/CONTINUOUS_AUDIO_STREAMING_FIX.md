# Continuous Audio Streaming Fix for ElevenLabs

## Critical Issue Discovered
ElevenLabs requires **continuous audio streaming** - you cannot stop sending audio chunks and expect transcription. The transcription is triggered by continuous audio flow, not by stopping.

## Why Your Transcriptions Are Missing
1. Frontend sends audio chunks while recording
2. Frontend stops recording and sends `user-audio-end`
3. Backend stops sending audio to ElevenLabs
4. **ElevenLabs never triggers transcription because audio flow stopped**
5. Transcriptions appear in dashboard because ElevenLabs processes them eventually, but not through WebSocket

## The Solution: Continuous Audio Flow

### Frontend Changes Required

#### 1. Send Silence During Gaps
```javascript
// When no audio chunks available but still recording
function sendSilenceChunk() {
  // 250ms of silence at 16kHz = 8000 bytes
  const silenceArray = new Uint8Array(8000);
  const silenceBase64 = btoa(String.fromCharCode(...silenceArray));
  
  socket.emit('send_audio', {
    audio: silenceBase64,
    isSilence: true
  });
}

// During recording, if no real audio for 200ms, send silence
let lastAudioTime = Date.now();
setInterval(() => {
  if (isRecording && Date.now() - lastAudioTime > 200) {
    sendSilenceChunk();
  }
}, 100);
```

#### 2. Continue Streaming After Recording Stops
```javascript
function stopRecording() {
  // Stop actual recording
  recording.stopAndUnloadAsync();
  
  // Continue sending silence for 1 second to trigger transcription
  const silenceInterval = setInterval(() => {
    sendSilenceChunk();
  }, 100);
  
  setTimeout(() => {
    clearInterval(silenceInterval);
    // Now send the end signal
    socket.emit('user-audio-end');
  }, 1000);
}
```

#### 3. Implement Proper Audio Buffer Management
```javascript
class AudioStreamer {
  constructor(socket) {
    this.socket = socket;
    this.audioBuffer = [];
    this.isStreaming = false;
    this.streamInterval = null;
  }

  startStreaming() {
    this.isStreaming = true;
    
    // Send audio every 100ms
    this.streamInterval = setInterval(() => {
      if (this.audioBuffer.length > 0) {
        // Send real audio
        const chunk = this.audioBuffer.shift();
        this.socket.emit('send_audio', { audio: chunk });
      } else if (this.isStreaming) {
        // Send silence to maintain stream
        this.sendSilence();
      }
    }, 100);
  }

  addAudioChunk(base64Audio) {
    this.audioBuffer.push(base64Audio);
  }

  sendSilence() {
    const silence = this.generateSilence(100); // 100ms
    this.socket.emit('send_audio', { 
      audio: silence,
      isSilence: true 
    });
  }

  stopStreaming() {
    // Send 1 second of silence before stopping
    for (let i = 0; i < 10; i++) {
      this.sendSilence();
    }
    
    setTimeout(() => {
      this.isStreaming = false;
      clearInterval(this.streamInterval);
      this.socket.emit('user-audio-end');
    }, 1000);
  }

  generateSilence(durationMs) {
    const samples = (16000 * durationMs) / 1000;
    const bytes = samples * 2; // 16-bit
    const silence = new Uint8Array(bytes);
    return btoa(String.fromCharCode(...silence));
  }
}
```

## Backend Already Fixed
The backend now:
1. Sends 500ms of silence when `user-audio-end` is received
2. Then sends empty chunk to flush
3. Has comprehensive logging to track the issue

## Testing Instructions

1. **Test Short Recording**:
   - Record for 3 seconds
   - Should see transcription within 2-3 seconds

2. **Test Long Recording**:
   - Record for 20+ seconds
   - Frontend should maintain continuous audio stream
   - Should see transcription after stop

3. **Monitor Logs**:
   - Look for "Session termination - sending silence"
   - Look for "User transcript received"
   - Check for "Unknown ElevenLabs message type"

## Why This Works
ElevenLabs uses Voice Activity Detection (VAD) to determine when to transcribe. When you stop sending audio abruptly, it doesn't know if you're done speaking or just paused. By sending silence followed by an empty chunk, we signal:
1. The user has stopped speaking (silence)
2. The audio session is complete (empty chunk)

## Alternative: Use Text Mode
If continuous audio streaming is too complex, consider using text mode for long inputs:
```javascript
if (recordingDuration > 15000) {
  // Use text input instead
  socket.emit('send_text', { text: userInput });
}
```