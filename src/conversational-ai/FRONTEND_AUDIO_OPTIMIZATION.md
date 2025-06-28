# Frontend Audio Optimization for ElevenLabs

## Current Issue
The speech recognition quality is poor compared to using ElevenLabs Scribe directly.

## Root Cause
The audio format and streaming approach need optimization for ElevenLabs' Conversational AI.

## Recommended Audio Format

### For Best Recognition (Matching Scribe):
```javascript
const RECORDING_OPTIONS = {
  android: {
    extension: '.pcm',  // Raw PCM instead of WAV
    outputFormat: Audio.RECORDING_OPTION_ANDROID_OUTPUT_FORMAT_PCM_16BIT,
    audioEncoder: Audio.RECORDING_OPTION_ANDROID_AUDIO_ENCODER_PCM_16BIT,
    sampleRate: 16000,  // Exactly 16kHz
    numberOfChannels: 1,
    bitRate: 256000,
  },
  ios: {
    extension: '.pcm',  // Raw PCM instead of WAV
    outputFormat: Audio.RECORDING_OPTION_IOS_OUTPUT_FORMAT_LINEARPCM,
    audioQuality: Audio.RECORDING_OPTION_IOS_AUDIO_QUALITY_HIGH,
    sampleRate: 16000,  // Exactly 16kHz
    numberOfChannels: 1,
    bitDepth: 16,
    linearPCMBitDepth: 16,
    linearPCMIsBigEndian: false,
    linearPCMIsFloat: false,
  },
  web: {
    mimeType: 'audio/webm;codecs=pcm',
    bitsPerSecond: 256000,
  }
};
```

## Key Optimizations

### 1. Audio Chunk Size
```javascript
// Current: Sending every 40ms (too frequent)
// Recommended: Send every 250ms for better balance
const CHUNK_INTERVAL = 250; // milliseconds

// This gives ~4KB chunks at 16kHz mono PCM
// Better for recognition accuracy
```

### 2. Audio Preprocessing
```javascript
// Before sending, ensure audio is:
// 1. Properly formatted as PCM 16-bit
// 2. Resampled to exactly 16kHz if needed
// 3. Converted to mono if stereo

// For WAV files, strip the header and send only PCM data:
function extractPCMFromWAV(wavBuffer) {
  // WAV header is typically 44 bytes
  // Skip it and send raw PCM
  return wavBuffer.slice(44);
}
```

### 3. Base64 Encoding of PCM
```javascript
// Convert PCM buffer to base64
function sendAudioChunk(pcmBuffer) {
  const base64Audio = pcmBuffer.toString('base64');
  socket.emit('send_audio', { audio: base64Audio });
}
```

### 4. Minimum Audio Duration
```javascript
// Don't send chunks shorter than 500ms
const MIN_AUDIO_DURATION = 500; // ms
const MIN_BUFFER_SIZE = (16000 * 2 * MIN_AUDIO_DURATION) / 1000; // bytes

if (audioBuffer.length >= MIN_BUFFER_SIZE) {
  sendAudioChunk(audioBuffer);
}
```

### 5. Voice Activity Detection (VAD)
```javascript
// Simple VAD to avoid sending silence
function hasVoiceActivity(pcmBuffer) {
  const samples = new Int16Array(pcmBuffer.buffer);
  const rms = Math.sqrt(
    samples.reduce((sum, sample) => sum + sample * sample, 0) / samples.length
  );
  return rms > VOICE_THRESHOLD; // e.g., 1000
}
```

## Backend Compatibility

The backend is ready to handle:
- Base64 encoded PCM data
- Various chunk sizes
- Streaming audio

## Testing Approach

1. **Test with Raw PCM**:
   - Record in PCM format directly
   - Send raw PCM data (no WAV header)
   - Compare recognition accuracy

2. **Test Chunk Sizes**:
   - Try 250ms chunks (recommended)
   - Try 500ms chunks (more stable)
   - Find optimal balance

3. **Test Audio Quality**:
   - Ensure 16kHz sample rate
   - Verify 16-bit depth
   - Check mono channel

## Expected Improvements

With these optimizations:
- Recognition accuracy should match ElevenLabs Scribe
- Lower latency (PCM has less overhead than WAV)
- More consistent transcription
- Better handling of continuous speech

## Quick Fix (If PCM is complex)

If switching to PCM is complex, optimize WAV:
1. Use exactly 16kHz sample rate
2. Send larger chunks (500ms+)
3. Ensure mono channel
4. Use uncompressed PCM WAV (not compressed)

The key is matching what ElevenLabs Scribe expects: **16-bit PCM at 16kHz mono**.