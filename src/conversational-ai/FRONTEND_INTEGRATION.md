# Frontend Integration Guide for Conversational AI

## Overview

This guide provides instructions for integrating the Conversational AI feature with your frontend application. The system enables real-time voice conversations with AI agents (Jung and Lakshmi) through WebSocket connections.

## Current Implementation Status

### Backend Ready ✅
- WebSocket server with Socket.IO namespaces (`/conversational-ai`)
- ElevenLabs integration with dynamic variables
- Conversation persistence in Supabase
- Dream context retrieval from interpretations
- User profile integration

### Dynamic Variables Passed to ElevenLabs
```typescript
{
  // User Context
  user_name: string,              // From profiles.username or handle
  age: number | 'unknown',        // Calculated from profiles.birth_date
  
  // Dream Content
  dreamContent: string,           // From dreams.raw_transcript
  dreamSymbols: string[],         // From interpretations.symbols
  clarity: number,                // From dreams.clarity (1-100)
  mood: number,                   // From dreams.mood (1-5)
  
  // Emotional Analysis
  emotionalToneprimary: string,   // From interpretations.emotionalTone
  emotionalToneintensity: number, // From interpretation metadata
  recurringThemes: string[],      // From interpretations.themes
  
  // Interpretation Data
  quickTake: string,              // From interpretations.quickTake
  interpretationSummary: string,  // From interpretations.interpretationSummary
  
  // Conversation Context
  previousMessages: string,       // Formatted conversation history
  max_turn_length: number         // Default: 150
}
```

## Frontend Requirements

### 1. Socket.IO Connection Setup

```typescript
import { io, Socket } from 'socket.io-client';

// Option 1: For new conversations (recommended)
const socket = io(`${BACKEND_URL}/conversational-ai`, {
  auth: {
    token: userAuthToken  // JWT token from authentication
  },
  transports: ['websocket']
});

// Option 2: For resuming existing conversations
const socket = io(`${BACKEND_URL}/conversational-ai`, {
  auth: {
    token: userAuthToken
  },
  query: {
    conversationId: existingConversationId  // Optional, for resuming
  },
  transports: ['websocket']
});
```

### 2. Required Events to Handle

#### Incoming Events (from server):
```typescript
// Connection established
socket.on('connect', () => {
  console.log('Connected to conversational AI');
});

// Conversation initialization confirmed
socket.on('conversation_initialized', (data: {
  conversationId: string;
  elevenLabsSessionId: string;
}) => {
  // Store conversation ID for future reference
});

// Real-time transcription of user speech
socket.on('user_transcript', (data: {
  text: string;
  isFinal: boolean;
}) => {
  // Display user's spoken text
});

// Agent's text response
socket.on('agent_response', (data: {
  text: string;
  role: string;
}) => {
  // Display agent's response text
});

// Audio chunks from agent
socket.on('audio_chunk', (data: {
  chunk: ArrayBuffer;
  isLast: boolean;
}) => {
  // Play audio chunk
});

// Conversation ended
socket.on('conversation_ended', (data: {
  conversationId: string;
  duration: number;
}) => {
  // Clean up resources
});

// Error handling
socket.on('error', (error: {
  code: string;
  message: string;
}) => {
  // Handle errors appropriately
});
```

#### Outgoing Events (to server):
```typescript
// Initialize conversation
socket.emit('initialize_conversation', {
  dreamId: string;        // Required: ID of the dream being discussed
  interpreterId: string;  // Required: 'jung' or 'lakshmi'
});

// Send audio data (PCM 16-bit, 16kHz mono)
socket.emit('send_audio', {
  audio: ArrayBuffer;     // Audio chunk
});

// Send text input (optional alternative to voice)
socket.emit('send_text', {
  text: string;
});

// End conversation
socket.emit('end_conversation');
```

### 3. Audio Recording Configuration

For React Native with Expo:
```typescript
import { Audio } from 'expo-av';

const recordingOptions = {
  android: {
    extension: '.pcm',
    outputFormat: Audio.RECORDING_OPTION_ANDROID_OUTPUT_FORMAT_PCM_16BIT,
    audioEncoder: Audio.RECORDING_OPTION_ANDROID_AUDIO_ENCODER_DEFAULT,
    sampleRate: 16000,  // ElevenLabs requirement
    numberOfChannels: 1,
    bitRate: 256000,
  },
  ios: {
    extension: '.pcm',
    audioQuality: Audio.RECORDING_OPTION_IOS_AUDIO_QUALITY_HIGH,
    sampleRate: 16000,  // ElevenLabs requirement
    numberOfChannels: 1,
    bitRate: 256000,
    linearPCMBitDepth: 16,
    linearPCMIsBigEndian: false,
    linearPCMIsFloat: false,
  },
};
```

### 4. Audio Playback

```typescript
// Convert incoming audio chunks to playable format
const playAudioChunk = async (audioData: ArrayBuffer) => {
  // For React Native
  const sound = new Audio.Sound();
  
  // Convert ArrayBuffer to base64 for React Native
  const base64Audio = btoa(
    new Uint8Array(audioData)
      .reduce((data, byte) => data + String.fromCharCode(byte), '')
  );
  
  await sound.loadAsync({
    uri: `data:audio/pcm;base64,${base64Audio}`
  });
  
  await sound.playAsync();
};
```

### 5. Complete Flow Example

```typescript
class ConversationManager {
  private socket: Socket;
  private recording: Audio.Recording | null = null;
  private audioQueue: ArrayBuffer[] = [];
  
  async startConversation(dreamId: string, interpreterId: string) {
    // 1. Connect to WebSocket
    this.socket = io(`${BACKEND_URL}/conversational-ai`, {
      auth: { token: getAuthToken() }
    });
    
    // 2. Set up event listeners
    this.socket.on('connect', () => {
      // 3. Initialize conversation
      this.socket.emit('initialize_conversation', {
        dreamId,
        interpreterId
      });
    });
    
    this.socket.on('conversation_initialized', async () => {
      // 4. Start recording audio
      await this.startRecording();
    });
    
    this.socket.on('audio_chunk', (data) => {
      // 5. Queue and play audio responses
      this.queueAudio(data.chunk);
    });
  }
  
  private async startRecording() {
    const { status } = await Audio.requestPermissionsAsync();
    if (status !== 'granted') return;
    
    this.recording = new Audio.Recording();
    await this.recording.prepareToRecordAsync(recordingOptions);
    await this.recording.startAsync();
    
    // Stream audio chunks every 100ms
    this.streamAudioInterval = setInterval(async () => {
      if (this.recording) {
        const uri = this.recording.getURI();
        if (uri) {
          const audioData = await this.getAudioData(uri);
          this.socket.emit('send_audio', { audio: audioData });
        }
      }
    }, 100);
  }
}
```

## Important Implementation Notes

### 1. Authentication
- Use JWT tokens in Socket.IO auth
- Tokens should include user_id claim
- Handle token expiration gracefully

### 2. Error Handling
```typescript
socket.on('error', (error) => {
  switch (error.code) {
    case 'CONVERSATION_NOT_FOUND':
      // Reinitialize conversation
      break;
    case 'ELEVENLABS_ERROR':
      // Fallback to text-only mode
      break;
    case 'UNAUTHORIZED':
      // Refresh auth token
      break;
  }
});
```

### 3. Network Optimization
- Implement exponential backoff for reconnections
- Buffer audio chunks during network interruptions
- Use compression for audio data if needed

### 4. State Management
Track these states in your frontend:
- `isConnected`: WebSocket connection status
- `isRecording`: Audio recording status
- `conversationId`: Current conversation ID
- `messages`: Array of conversation messages
- `isAgentSpeaking`: Whether agent audio is playing

### 5. Cleanup
```typescript
// Always clean up resources
const cleanup = async () => {
  if (recording) {
    await recording.stopAndUnloadAsync();
  }
  if (socket) {
    socket.emit('end_conversation');
    socket.disconnect();
  }
  // Clear audio queue and stop playback
};
```

## Testing Endpoints

### REST API Endpoints
- `POST /api/dreams/:dreamId/interpret` - Generate interpretation first
- `GET /api/conversations/:conversationId` - Get conversation details
- `GET /api/conversations/:conversationId/messages` - Get message history

### WebSocket Testing
1. Connect to `ws://localhost:3001/conversational-ai`
2. Send `initialize_conversation` event
3. Send audio or text data
4. Verify responses are received

## Next Steps for Frontend

1. **Implement Audio Streaming**
   - Set up continuous audio recording
   - Stream PCM 16-bit audio at 16kHz
   - Handle audio playback queue

2. **Build Conversation UI**
   - Real-time transcript display
   - Agent response visualization
   - Voice activity indicators

3. **Add State Management**
   - Track conversation state
   - Persist messages locally
   - Handle offline scenarios

4. **Optimize Performance**
   - Implement audio compression
   - Add request debouncing
   - Cache conversation data

5. **Enhance UX**
   - Add speaking indicators
   - Show connection status
   - Implement push-to-talk option