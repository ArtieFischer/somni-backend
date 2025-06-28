# Audio Chunking Solution for Long Recordings

## Problem
ElevenLabs struggles with:
1. Long recordings (> 20 seconds) 
2. Recordings with extensive silence
3. Large audio chunks that timeout before transcription

## Root Cause Analysis
From the logs:
- First recording (11.8s) → Transcribed successfully ✅
- Second recording (27.6s with lots of silence) → No transcription ❌
- Pattern: Recordings > 20s or with > 50% silence fail

## Solution: Smart Audio Chunking

### Backend Changes Needed

#### 1. Track Audio Session State
```typescript
// In elevenlabs.service.ts
private audioSessionState = {
  startTime: 0,
  totalDuration: 0,
  chunksSent: 0,
  silenceRatio: 0,
  expectingTranscription: false
};
```

#### 2. Implement Audio Session Management
```typescript
// When first audio chunk is sent
startAudioSession() {
  this.audioSessionState = {
    startTime: Date.now(),
    totalDuration: 0,
    chunksSent: 0,
    silenceRatio: 0,
    expectingTranscription: true
  };
}

// When audio session ends
endAudioSession() {
  if (this.audioSessionState.expectingTranscription) {
    // Force a flush or session end
    this.sendSessionEnd();
  }
}
```

#### 3. Send Session End Signal
```typescript
sendSessionEnd(): void {
  // Send a specific signal to mark end of audio input
  this.ws.send(JSON.stringify({
    type: 'audio_session_end'
  }));
  
  // Or try sending empty audio chunk to flush
  this.ws.send(JSON.stringify({
    user_audio_chunk: ''
  }));
}
```

### Frontend Changes Needed

#### 1. Implement Recording Chunking
```javascript
// Maximum recording duration before forcing a new session
const MAX_RECORDING_DURATION = 15000; // 15 seconds

// Track recording duration
let recordingStartTime = Date.now();
let recordingTimer = null;

function startRecording() {
  recordingStartTime = Date.now();
  
  // Auto-stop and restart for long recordings
  recordingTimer = setTimeout(() => {
    if (isRecording) {
      // Stop current recording
      stopRecording();
      
      // Show "Processing..." briefly
      showProcessingIndicator();
      
      // Restart recording after 1 second
      setTimeout(() => {
        startRecording();
      }, 1000);
    }
  }, MAX_RECORDING_DURATION);
}
```

#### 2. Implement Silence Detection
```javascript
// Track silence ratio
let silentChunks = 0;
let totalChunks = 0;

function processAudioChunk(chunk) {
  totalChunks++;
  
  if (isChunkSilent(chunk)) {
    silentChunks++;
  }
  
  const silenceRatio = silentChunks / totalChunks;
  
  // If too much silence, end recording
  if (silenceRatio > 0.7 && totalChunks > 10) {
    stopRecording();
  }
}
```

#### 3. Send Smaller Audio Chunks
```javascript
// Buffer audio data
let audioBuffer = [];
const MAX_BUFFER_SIZE = 32000; // ~1 second at 16kHz stereo

function streamAudioChunk(pcmData) {
  audioBuffer.push(...pcmData);
  
  // Send when buffer is full
  if (audioBuffer.length >= MAX_BUFFER_SIZE) {
    const chunk = audioBuffer.splice(0, MAX_BUFFER_SIZE);
    socket.emit('send_audio', {
      audio: btoa(String.fromCharCode(...chunk))
    });
  }
}
```

## Immediate Workaround

Until proper chunking is implemented:

### 1. Educate Users
Show a message: "For best results, keep recordings under 15 seconds"

### 2. Visual Timer
Show a countdown timer during recording

### 3. Auto-Stop
Automatically stop recording at 15 seconds

### 4. Retry Logic
If no transcription received after 10 seconds:
- Show "Processing failed, please try again"
- Allow user to re-record

## Testing Strategy

1. Test short recording (< 10s) → Should work
2. Test medium recording (10-20s) → Should work
3. Test long recording (> 20s) → Should be chunked
4. Test silent recording → Should auto-stop

## Expected Results

With chunking:
- All recordings transcribed successfully
- Better user experience
- No timeout errors
- Faster response times