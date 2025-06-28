# Frontend-Backend Audio Communication Compliance

## ✅ Backend is READY to support the specified communication format

### Incoming Events (Frontend → Backend)

#### 1. ✅ Audio Streaming Chunks
- **Event**: `send_audio`
- **Handler**: `handleAudioChunk()`
- **Processing**: 
  - Accepts `{ audio: "base64_string" }`
  - Forwards to ElevenLabs as `{ user_audio_chunk: "base64" }`
  - Updates activity timestamp

#### 2. ✅ End of Audio Stream  
- **Event**: `user-audio-end`
- **Handler**: `handleUserAudioEnd()`
- **Processing**: Sends `{ terminate_session: true }` to ElevenLabs

#### 3. ✅ Text Messages
- **Event**: `send_text`
- **Handler**: `handleTextInput()`
- **Processing**: Existing functionality maintained

### Outgoing Events (Backend → Frontend)

#### 1. ✅ Audio Response Chunks
- **Event**: `audio_chunk`
- **Format**: 
  ```javascript
  {
    chunk: ArrayBuffer,  // MP3 binary data from ElevenLabs
    isLast: boolean      // Currently always false
  }
  ```
- **Implementation**: Converts ElevenLabs Buffer to ArrayBuffer

#### 2. ✅ Text Responses
- **Events**: `agent_response`, `text_response`
- **Format**: Existing format maintained

#### 3. ✅ Transcriptions
- **Event**: `transcription`
- **Format**: 
  ```javascript
  {
    text: string,
    isFinal: boolean,
    speaker: "user" | "agent",
    timestamp: number
  }
  ```

#### 4. ✅ ElevenLabs Status Events
- **Event**: `elevenlabs_conversation_initiated`
  ```javascript
  {
    audioFormat: "pcm_16000",
    conversationId: "conv_xxx"
  }
  ```

- **Event**: `elevenlabs_disconnected`
  ```javascript
  {
    reason: string,
    timeout?: number  // 60000 for inactivity timeout
  }
  ```

### Data Flow Implementation

```
Frontend (PCM WAV)         Backend              ElevenLabs
    |                         |                      |
    |--send_audio------------>|                      |
    |  {audio: "base64"}      |--{user_audio_chunk}->|
    |                         |                      |
    |                         |<--Buffer (MP3)-------|
    |<--audio_chunk-----------|                      |
    |  {chunk: ArrayBuffer}   |                      |
    |                         |                      |
    |--user-audio-end-------->|                      |
    |                         |--{terminate_session}->|
```

### Key Implementation Details

1. **Audio Format Handling**:
   - Input: Base64-encoded PCM WAV (16-bit, 16kHz, mono)
   - Output: MP3 ArrayBuffer chunks

2. **Session Management**:
   - One ElevenLabs WebSocket per user session
   - Proper cleanup on disconnect
   - Timeout handling with reconnection requirements

3. **Backward Compatibility**:
   - All existing events preserved
   - Additional events added for audio streaming

### Testing

Created test scripts:
- `test-frontend-backend-communication.ts`: Validates spec compliance
- `test-audio-streaming.ts`: Tests audio streaming flow

### Notes

- The `isLast` property in audio chunks is currently always `false` as ElevenLabs doesn't signal the last chunk explicitly
- Session termination is handled via `user-audio-end` event
- All events include proper error handling and timeout detection