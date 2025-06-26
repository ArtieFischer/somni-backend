# Frontend Integration Guide for Conversational AI

## Overview

This guide provides detailed instructions for integrating the Conversational AI feature with your frontend application. The system supports real-time voice conversations with AI agents that maintain the same personalities as the dream interpreters.

## Architecture

```
┌─────────────────┐     WebSocket      ┌─────────────────┐     WebSocket      ┌─────────────────┐
│                 │ ◄─────────────────► │                 │ ◄─────────────────► │                 │
│  Frontend App   │    (Socket.IO)      │  Backend Server │  (ElevenLabs API)  │   ElevenLabs    │
│                 │                     │                 │                     │                 │
└─────────────────┘                     └─────────────────┘                     └─────────────────┘
     Audio/Text                              Routing                              AI Processing
```

## Complete Frontend Flow

### 1. Prerequisites

```bash
# Install required packages (React Native example)
npm install socket.io-client expo-av

# For React web
npm install socket.io-client
```

### 2. Conversation Initialization

```typescript
// services/conversationService.ts
import { io, Socket } from 'socket.io-client';

interface ConversationConfig {
  dreamId: string;
  interpreterId: 'jung' | 'lakshmi';
  authToken: string;
}

class ConversationService {
  private socket: Socket | null = null;
  private recording: Audio.Recording | null = null;
  
  async startConversation(config: ConversationConfig): Promise<void> {
    // Step 1: Initialize conversation via REST API
    const response = await fetch(`${API_BASE_URL}/api/conversations/start`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.authToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        dreamId: config.dreamId,
        interpreterId: config.interpreterId
      })
    });

    if (!response.ok) {
      throw new Error('Failed to start conversation');
    }

    const { conversationId, websocketUrl, token } = await response.json();

    // Step 2: Connect to WebSocket
    this.socket = io(websocketUrl, {
      auth: { token },
      query: { conversationId },
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 3,
      reconnectionDelay: 1000
    });

    this.setupEventListeners();
  }
}
```

### 3. Audio Recording and Streaming

```typescript
// React Native implementation
import { Audio } from 'expo-av';

class AudioManager {
  private recording: Audio.Recording | null = null;
  private isRecording = false;
  
  async initializeAudio(): Promise<void> {
    // Request permissions
    const { status } = await Audio.requestPermissionsAsync();
    if (status !== 'granted') {
      throw new Error('Audio permission not granted');
    }

    // Configure audio mode
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: true,
      playsInSilentModeIOS: true,
      staysActiveInBackground: true,
      shouldDuckAndroid: true,
      playThroughEarpieceAndroid: false
    });
  }

  async startRecording(onAudioData: (data: ArrayBuffer) => void): Promise<void> {
    this.recording = new Audio.Recording();
    
    await this.recording.prepareToRecordAsync({
      android: {
        extension: '.wav',
        outputFormat: Audio.RECORDING_OPTION_ANDROID_OUTPUT_FORMAT_PCM_16BIT,
        audioEncoder: Audio.RECORDING_OPTION_ANDROID_AUDIO_ENCODER_PCM_16BIT,
        sampleRate: 16000, // ElevenLabs preferred rate
        numberOfChannels: 1,
        bitRate: 128000,
      },
      ios: {
        extension: '.wav',
        audioQuality: Audio.RECORDING_OPTION_IOS_AUDIO_QUALITY_HIGH,
        sampleRate: 16000,
        numberOfChannels: 1,
        bitRate: 128000,
        linearPCMBitDepth: 16,
        linearPCMIsBigEndian: false,
        linearPCMIsFloat: false,
      },
    });

    await this.recording.startAsync();
    this.isRecording = true;

    // Stream audio chunks every 100ms
    this.streamAudioChunks(onAudioData);
  }

  private async streamAudioChunks(onAudioData: (data: ArrayBuffer) => void): Promise<void> {
    while (this.isRecording) {
      if (this.recording) {
        const status = await this.recording.getStatusAsync();
        if (status.isRecording && status.durationMillis > 100) {
          // Get audio URI and convert to ArrayBuffer
          const uri = this.recording.getURI();
          if (uri) {
            const response = await fetch(uri);
            const arrayBuffer = await response.arrayBuffer();
            onAudioData(arrayBuffer);
          }
        }
      }
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  async stopRecording(): Promise<void> {
    this.isRecording = false;
    if (this.recording) {
      await this.recording.stopAndUnloadAsync();
      this.recording = null;
    }
  }
}
```

### 4. WebSocket Event Handling

```typescript
interface ConversationEvents {
  onConnectionEstablished: () => void;
  onUserTranscript: (text: string) => void;
  onAgentResponse: (text: string, isTentative: boolean) => void;
  onAudioResponse: (audioData: ArrayBuffer) => void;
  onVADScore: (score: number) => void;
  onError: (error: Error) => void;
}

class ConversationManager {
  private audioPlayer = new AudioPlayer();
  
  setupEventListeners(events: ConversationEvents): void {
    if (!this.socket) return;

    // Connection events
    this.socket.on('connect', () => {
      console.log('Connected to conversation server');
      events.onConnectionEstablished();
    });

    this.socket.on('conversation_started', (data) => {
      // Initial greeting from agent
      events.onAgentResponse(data.message, false);
    });

    // Transcription events
    this.socket.on('transcription', (data) => {
      if (data.speaker === 'user') {
        events.onUserTranscript(data.text);
      }
    });

    // Agent responses
    this.socket.on('agent_response', (data) => {
      events.onAgentResponse(data.text, data.isTentative);
    });

    // Audio responses
    this.socket.on('audio_response', async (data) => {
      const audioBuffer = data.chunk;
      await this.audioPlayer.playAudio(audioBuffer);
      events.onAudioResponse(audioBuffer);
    });

    // Voice Activity Detection
    this.socket.on('vad_score', (data) => {
      events.onVADScore(data.score);
    });

    // Error handling
    this.socket.on('error', (error) => {
      events.onError(new Error(error.message || 'Connection error'));
    });

    this.socket.on('disconnect', (reason) => {
      console.log('Disconnected:', reason);
      if (reason === 'io server disconnect') {
        // Server disconnected, don't attempt to reconnect
        events.onError(new Error('Server disconnected'));
      }
    });
  }

  sendAudioChunk(audioData: ArrayBuffer): void {
    if (this.socket?.connected) {
      this.socket.emit('audio_chunk', { chunk: audioData });
    }
  }

  sendTextMessage(text: string): void {
    if (this.socket?.connected) {
      this.socket.emit('text_input', { text });
    }
  }

  endConversation(): void {
    if (this.socket?.connected) {
      this.socket.emit('end_conversation');
      this.socket.disconnect();
    }
  }
}
```

### 5. Audio Playback

```typescript
class AudioPlayer {
  private currentSound: Audio.Sound | null = null;
  private audioQueue: ArrayBuffer[] = [];
  private isPlaying = false;

  async playAudio(audioBuffer: ArrayBuffer): Promise<void> {
    // Add to queue
    this.audioQueue.push(audioBuffer);
    
    // Start playing if not already playing
    if (!this.isPlaying) {
      this.processAudioQueue();
    }
  }

  private async processAudioQueue(): Promise<void> {
    this.isPlaying = true;
    
    while (this.audioQueue.length > 0) {
      const audioBuffer = this.audioQueue.shift()!;
      
      try {
        // Convert ArrayBuffer to base64 for React Native
        const base64 = btoa(
          new Uint8Array(audioBuffer)
            .reduce((data, byte) => data + String.fromCharCode(byte), '')
        );
        
        this.currentSound = new Audio.Sound();
        await this.currentSound.loadAsync({
          uri: `data:audio/pcm;base64,${base64}`
        });
        
        await this.currentSound.playAsync();
        
        // Wait for playback to complete
        await new Promise<void>((resolve) => {
          this.currentSound!.setOnPlaybackStatusUpdate((status) => {
            if (status.isLoaded && status.didJustFinish) {
              resolve();
            }
          });
        });
        
        await this.currentSound.unloadAsync();
        this.currentSound = null;
        
      } catch (error) {
        console.error('Error playing audio:', error);
      }
    }
    
    this.isPlaying = false;
  }

  async stop(): Promise<void> {
    this.audioQueue = [];
    if (this.currentSound) {
      await this.currentSound.stopAsync();
      await this.currentSound.unloadAsync();
      this.currentSound = null;
    }
    this.isPlaying = false;
  }
}
```

### 6. React Component Example

```tsx
import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';

interface Message {
  id: string;
  speaker: 'user' | 'agent';
  text: string;
  timestamp: Date;
}

export function ConversationScreen({ dreamId, interpreterId }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [agentText, setAgentText] = useState('');
  
  const conversationManager = useRef(new ConversationManager());
  const audioManager = useRef(new AudioManager());

  useEffect(() => {
    startConversation();
    return () => {
      conversationManager.current.endConversation();
    };
  }, []);

  const startConversation = async () => {
    try {
      await audioManager.current.initializeAudio();
      
      await conversationManager.current.startConversation({
        dreamId,
        interpreterId,
        authToken: getAuthToken()
      });

      conversationManager.current.setupEventListeners({
        onConnectionEstablished: () => setIsConnected(true),
        onUserTranscript: (text) => {
          addMessage('user', text);
        },
        onAgentResponse: (text, isTentative) => {
          if (!isTentative) {
            addMessage('agent', text);
          }
          setAgentText(text);
        },
        onAudioResponse: (audioData) => {
          // Audio is played automatically by AudioPlayer
        },
        onVADScore: (score) => {
          setIsSpeaking(score > 0.5);
        },
        onError: (error) => {
          console.error('Conversation error:', error);
          // Handle error in UI
        }
      });
    } catch (error) {
      console.error('Failed to start conversation:', error);
    }
  };

  const toggleRecording = async () => {
    if (isRecording) {
      await audioManager.current.stopRecording();
      setIsRecording(false);
    } else {
      setIsRecording(true);
      await audioManager.current.startRecording((audioData) => {
        conversationManager.current.sendAudioChunk(audioData);
      });
    }
  };

  const addMessage = (speaker: 'user' | 'agent', text: string) => {
    setMessages(prev => [...prev, {
      id: Date.now().toString(),
      speaker,
      text,
      timestamp: new Date()
    }]);
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.messageList}>
        {messages.map(message => (
          <View 
            key={message.id} 
            style={[
              styles.message,
              message.speaker === 'user' ? styles.userMessage : styles.agentMessage
            ]}
          >
            <Text>{message.text}</Text>
          </View>
        ))}
      </ScrollView>
      
      {agentText && (
        <View style={styles.agentStatus}>
          <Text>{interpreterId === 'jung' ? 'Jung' : 'Lakshmi'}: {agentText}</Text>
        </View>
      )}
      
      <View style={styles.controls}>
        <TouchableOpacity 
          style={[styles.recordButton, isRecording && styles.recording]}
          onPress={toggleRecording}
          disabled={!isConnected}
        >
          <Text>{isRecording ? 'Stop' : 'Start'} Recording</Text>
        </TouchableOpacity>
        
        {isSpeaking && <Text>You are speaking...</Text>}
      </View>
    </View>
  );
}
```

## Error Handling

### Connection Errors
```typescript
// Automatic reconnection is handled by Socket.IO
const socket = io(url, {
  reconnection: true,
  reconnectionAttempts: 3,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000
});

// Manual reconnection
socket.on('disconnect', (reason) => {
  if (reason === 'io server disconnect') {
    // Server forcefully disconnected, manual reconnection needed
    setTimeout(() => {
      socket.connect();
    }, 1000);
  }
});
```

### Audio Errors
```typescript
// Handle audio permission errors
try {
  const { status } = await Audio.requestPermissionsAsync();
  if (status !== 'granted') {
    // Show UI message to user about missing permissions
  }
} catch (error) {
  // Handle permission request failure
}

// Handle recording errors
recording.setOnRecordingStatusUpdate((status) => {
  if (status.error) {
    console.error('Recording error:', status.error);
    // Stop recording and show error to user
  }
});
```

## Testing

### 1. Test Connection
```typescript
// Test WebSocket connection
socket.on('connect', () => {
  console.log('✅ WebSocket connected');
});

socket.on('connect_error', (error) => {
  console.error('❌ Connection error:', error.message);
});
```

### 2. Test Audio Flow
```typescript
// Test audio recording
const testRecording = async () => {
  const recording = new Audio.Recording();
  await recording.prepareToRecordAsync(recordingOptions);
  await recording.startAsync();
  
  setTimeout(async () => {
    await recording.stopAndUnloadAsync();
    const uri = recording.getURI();
    console.log('✅ Recording saved to:', uri);
  }, 2000);
};
```

### 3. Test Message Flow
```typescript
// Send test message
socket.emit('text_input', { text: 'Hello, can you hear me?' });

// Listen for response
socket.on('agent_response', (data) => {
  console.log('✅ Received response:', data.text);
});
```

## Performance Optimization

### 1. Audio Chunking
- Send audio chunks every 100-200ms for optimal latency
- Use 16kHz sample rate as recommended by ElevenLabs
- Compress audio if bandwidth is limited

### 2. Message Batching
- Batch rapid UI updates to prevent performance issues
- Use debouncing for transcription updates

### 3. Memory Management
- Properly cleanup audio resources
- Disconnect WebSocket when leaving screen
- Clear message history for long conversations

## Troubleshooting

### Common Issues

1. **No Audio Input**
   - Check microphone permissions
   - Verify audio mode configuration
   - Test with device microphone app

2. **No Audio Output**
   - Check device volume
   - Verify audio format compatibility
   - Test with simple audio playback

3. **Connection Drops**
   - Check network stability
   - Verify JWT token expiration
   - Monitor WebSocket reconnection events

4. **High Latency**
   - Reduce audio quality/bitrate
   - Check network speed
   - Consider geographic proximity to servers

## Security Considerations

1. **Never expose API keys in frontend code**
2. **Always use HTTPS/WSS in production**
3. **Implement rate limiting for audio uploads**
4. **Validate all user inputs before sending**
5. **Store auth tokens securely**

## Next Steps

1. Implement visual feedback for audio levels
2. Add conversation history persistence
3. Support multiple languages
4. Add offline mode with queued messages
5. Implement push notifications for async responses