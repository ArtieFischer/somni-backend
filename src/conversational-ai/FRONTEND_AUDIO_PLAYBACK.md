# Frontend Audio Playback Guide

## Overview
The backend now streams audio chunks from ElevenLabs to the frontend in base64 format for reliable transport.

## Audio Stream Events

### 1. `audio_chunk` Event
Receive audio data from the agent's response:

```javascript
socket.on('audio_chunk', (data) => {
  const {
    audio,      // Base64 encoded audio data
    format,     // 'base64'
    sampleRate, // 16000 (16kHz)
    isLast      // false (currently always false)
  } = data;
  
  // Process the audio chunk
  processAudioChunk(audio);
});
```

### 2. `audio_done` Event
Signals when audio playback should be complete:

```javascript
socket.on('audio_done', () => {
  // Audio streaming is complete
  finalizeAudioPlayback();
});
```

## Audio Playback Implementation

### Basic Approach - Web Audio API

```javascript
class AudioPlayer {
  constructor() {
    this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    this.audioQueue = [];
    this.isPlaying = false;
  }

  async processAudioChunk(base64Audio) {
    // Convert base64 to ArrayBuffer
    const binaryString = atob(base64Audio);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    
    // Queue the audio data
    this.audioQueue.push(bytes.buffer);
    
    // Start playback if not already playing
    if (!this.isPlaying) {
      this.startPlayback();
    }
  }

  async startPlayback() {
    this.isPlaying = true;
    
    while (this.audioQueue.length > 0) {
      const audioData = this.audioQueue.shift();
      await this.playAudioBuffer(audioData);
    }
    
    this.isPlaying = false;
  }

  async playAudioBuffer(arrayBuffer) {
    try {
      // Decode the audio data
      const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
      
      // Create a source node
      const source = this.audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(this.audioContext.destination);
      
      // Play the audio
      source.start(0);
      
      // Wait for playback to complete
      return new Promise(resolve => {
        source.onended = resolve;
      });
    } catch (error) {
      console.error('Error playing audio:', error);
    }
  }
}
```

### React Native Approach

```javascript
import { Audio } from 'expo-av';

class AudioPlayer {
  constructor() {
    this.audioQueue = [];
    this.isPlaying = false;
    this.sound = null;
  }

  async processAudioChunk(base64Audio) {
    // For React Native, you might need to save chunks and play as complete file
    // Or use a streaming audio library
    this.audioQueue.push(base64Audio);
    
    if (!this.isPlaying) {
      this.startPlayback();
    }
  }

  async startPlayback() {
    this.isPlaying = true;
    
    // Combine all chunks into one audio file
    const combinedAudio = this.audioQueue.join('');
    this.audioQueue = [];
    
    // Create data URI
    const audioUri = `data:audio/mp3;base64,${combinedAudio}`;
    
    try {
      // Load and play
      const { sound } = await Audio.Sound.createAsync(
        { uri: audioUri },
        { shouldPlay: true }
      );
      this.sound = sound;
      
      // Set up playback status update
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.didJustFinish) {
          this.isPlaying = false;
          this.cleanup();
        }
      });
    } catch (error) {
      console.error('Error playing audio:', error);
      this.isPlaying = false;
    }
  }

  async cleanup() {
    if (this.sound) {
      await this.sound.unloadAsync();
      this.sound = null;
    }
  }
}
```

## Complete Integration Example

```javascript
// Initialize audio player
const audioPlayer = new AudioPlayer();

// Socket event handlers
socket.on('agent_response', (data) => {
  // Show text response immediately
  displayAgentText(data.text);
});

socket.on('audio_chunk', (data) => {
  // Stream audio as it arrives
  audioPlayer.processAudioChunk(data.audio);
});

socket.on('audio_done', () => {
  // Audio streaming complete
  console.log('Agent finished speaking');
});

socket.on('transcription', (data) => {
  if (data.speaker === 'user') {
    displayUserTranscript(data.text);
  }
});

socket.on('vad_score', (data) => {
  // Update UI based on voice activity
  updateVADIndicator(data.score);
});
```

## Audio Format Details

ElevenLabs sends audio in the following format:
- **Sample Rate**: 16kHz (16000 Hz)
- **Format**: PCM 16-bit
- **Channels**: Mono
- **Encoding**: Base64 in transport

## Troubleshooting

### Issue: Choppy Playback
**Solution**: Buffer more chunks before starting playback

```javascript
// Wait for minimum buffer before playing
if (this.audioQueue.length < 3 && !this.isFinalChunk) {
  return; // Wait for more chunks
}
```

### Issue: Audio Format Not Supported
**Solution**: ElevenLabs might send MP3 instead of PCM. Check the actual format:

```javascript
// Try different MIME types
const formats = [
  'audio/mpeg',  // MP3
  'audio/wav',   // WAV
  'audio/pcm'    // Raw PCM
];
```

### Issue: Memory Leaks
**Solution**: Always clean up audio resources

```javascript
// Clean up when conversation ends
socket.on('conversation_ended', () => {
  audioPlayer.cleanup();
});
```

## Advanced Features

### 1. Audio Visualization
```javascript
// Create analyser for visualization
const analyser = audioContext.createAnalyser();
source.connect(analyser);
analyser.connect(audioContext.destination);

// Get frequency data
const dataArray = new Uint8Array(analyser.frequencyBinCount);
analyser.getByteFrequencyData(dataArray);
```

### 2. Volume Control
```javascript
// Add gain node for volume
const gainNode = audioContext.createGain();
source.connect(gainNode);
gainNode.connect(audioContext.destination);
gainNode.gain.value = 0.5; // 50% volume
```

### 3. Playback Speed
```javascript
source.playbackRate.value = 1.2; // 20% faster
```