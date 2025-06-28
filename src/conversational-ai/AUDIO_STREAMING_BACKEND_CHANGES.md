# Audio Streaming Backend Implementation

## Overview
Updated the backend to support real-time audio streaming for the mobile app, following the Expo audio streaming guide.

## Changes Made

### 1. ElevenLabs Service (`elevenlabs.service.ts`)
- **Updated `sendAudio()` method**: Now accepts both `ArrayBuffer` and `string` (base64) formats
- **Added `sendSessionTermination()` method**: Sends `terminate_session` signal when user stops recording
- **Updated `handleAudioData()` method**: Emits raw binary data for streaming compatibility
- **Added activity tracking**: Updates `lastActivityTime` on audio send

### 2. WebSocket Handler (`conversational-ai-handler.ts`)
- **Added new event listeners**:
  - `user-audio`: Handles streaming audio chunks from mobile
  - `user-audio-end`: Handles recording stop signal
- **Added `handleUserAudioEnd()` method**: Sends session termination to ElevenLabs
- **Updated audio forwarding**: Emits audio in both formats:
  - `audio_chunk`: Original format (backward compatibility)
  - `ai-audio`: Raw binary format (mobile guide compatibility)

### 3. Event Flow

#### Mobile → Backend → ElevenLabs
```
Mobile app sends:
- 'user-audio' event with { audio: base64String } every 40ms
- 'user-audio-end' event when recording stops

Backend:
- Receives base64 audio chunks
- Forwards to ElevenLabs as { user_audio_chunk: base64String }
- Sends { terminate_session: true } on user-audio-end
```

#### ElevenLabs → Backend → Mobile
```
ElevenLabs sends:
- Binary MP3 audio chunks
- JSON messages (transcriptions, responses)

Backend:
- Receives binary audio data
- Emits as 'ai-audio' event (raw binary)
- Also emits as 'audio_chunk' for backward compatibility
```

## Testing
Created `test-audio-streaming.ts` to verify:
- Audio chunk streaming simulation
- Event flow verification
- Session termination handling
- Format compatibility

## Usage
The frontend should:
1. Send audio chunks via `user-audio` event with base64 encoded audio
2. Listen for `ai-audio` events for MP3 playback
3. Send `user-audio-end` when recording stops
4. Handle standard events (transcription, agent_response, etc.)

## Backward Compatibility
All existing event names and formats are preserved. New events are added alongside existing ones to ensure smooth migration.