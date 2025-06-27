# Frontend WebSocket Integration Guide

## Overview

This guide explains how to integrate the WebSocket namespaces in your frontend application for both Dream Interpretation and Conversational AI features.

## Installation

```bash
npm install socket.io-client
# or
yarn add socket.io-client
```

## TypeScript Types

Create a types file for WebSocket events:

```typescript
// types/websocket.types.ts

// Dream Interpretation Types
export interface DreamInterpretationEvents {
  // Client to Server
  startConversation: (data: {
    dreamId: string;
    interpreterId: 'jung' | 'freud' | 'mary' | 'lakshmi';
    dreamInterpretation?: any;
    userName?: string;
    initialMessage?: string;
  }) => void;
  
  sendMessage: (data: { message: string }) => void;
  endConversation: () => void;
  typing: (data: { isTyping: boolean }) => void;

  // Server to Client
  connectionStatus: (data: { status: string }) => void;
  conversationStarted: (data: {
    sessionId: string;
    conversationId: string;
    interpreterId: string;
  }) => void;
  
  messageReceived: (data: {
    message: string;
    timestamp: Date;
  }) => void;
  
  agentTyping: (data: { isTyping: boolean }) => void;
  conversationEnded: (data: { reason: string; summary?: string }) => void;
  error: (data: { code: string; message: string }) => void;
}

// Conversational AI Types
export interface ConversationalAIEvents {
  // Client to Server
  audio_chunk: (data: { chunk: ArrayBuffer }) => void;
  text_input: (data: { text: string }) => void;
  end_conversation: () => void;

  // Server to Client
  conversation_started: (data: {
    message: string;
    interpreter: string;
    mode: 'voice' | 'text';
  }) => void;
  
  audio_response: (chunk: ArrayBuffer) => void;
  text_response: (data: { text: string }) => void;
  
  transcription: (event: {
    text: string;
    speaker: 'user' | 'agent';
    timestamp: number;
    isFinal: boolean;
  }) => void;
  
  agent_response: (response: any) => void;
  error: (error: { message: string }) => void;
  
  reconnecting: (data: { attempt: number }) => void;
  reconnected: () => void;
  conversation_ended: (data: { conversationId: string }) => void;
}
```

## WebSocket Service Implementation

### Base WebSocket Service

```typescript
// services/websocket.service.ts
import { io, Socket } from 'socket.io-client';

export class WebSocketService {
  private socket: Socket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;

  constructor(
    private namespace: string,
    private token: string,
    private options?: any
  ) {}

  connect(): Promise<Socket> {
    return new Promise((resolve, reject) => {
      this.socket = io(`${process.env.REACT_APP_API_URL}${this.namespace}`, {
        auth: { token: this.token },
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: this.maxReconnectAttempts,
        reconnectionDelay: 1000,
        ...this.options
      });

      this.socket.on('connect', () => {
        console.log(`Connected to ${this.namespace}`);
        this.reconnectAttempts = 0;
        resolve(this.socket);
      });

      this.socket.on('connect_error', (error) => {
        console.error(`Connection error on ${this.namespace}:`, error.message);
        reject(error);
      });

      this.socket.on('disconnect', (reason) => {
        console.log(`Disconnected from ${this.namespace}:`, reason);
      });
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  getSocket(): Socket | null {
    return this.socket;
  }

  isConnected(): boolean {
    return this.socket?.connected || false;
  }
}
```

### Dream Interpretation Service

```typescript
// services/dreamInterpretation.websocket.ts
import { WebSocketService } from './websocket.service';
import { DreamInterpretationEvents } from '../types/websocket.types';

export class DreamInterpretationWebSocket extends WebSocketService {
  constructor(token: string) {
    super('/ws/dream', token);
  }

  async startConversation(params: {
    dreamId: string;
    interpreterId: 'jung' | 'freud' | 'mary' | 'lakshmi';
    userName?: string;
    initialMessage?: string;
  }): Promise<void> {
    const socket = await this.connect();
    
    return new Promise((resolve, reject) => {
      // Listen for conversation started
      socket.once('conversationStarted', (data) => {
        console.log('Conversation started:', data);
        resolve();
      });

      socket.once('error', (error) => {
        reject(new Error(error.message));
      });

      // Start the conversation
      socket.emit('startConversation', params);
    });
  }

  sendMessage(message: string): void {
    this.getSocket()?.emit('sendMessage', { message });
  }

  endConversation(): void {
    this.getSocket()?.emit('endConversation');
  }

  setTyping(isTyping: boolean): void {
    this.getSocket()?.emit('typing', { isTyping });
  }

  // Event listeners
  onMessageReceived(callback: (data: { message: string; timestamp: Date }) => void) {
    this.getSocket()?.on('messageReceived', callback);
  }

  onAgentTyping(callback: (data: { isTyping: boolean }) => void) {
    this.getSocket()?.on('agentTyping', callback);
  }

  onConversationEnded(callback: (data: { reason: string; summary?: string }) => void) {
    this.getSocket()?.on('conversationEnded', callback);
  }

  onError(callback: (error: { code: string; message: string }) => void) {
    this.getSocket()?.on('error', callback);
  }
}
```

### Conversational AI Service

```typescript
// services/conversationalAI.websocket.ts
import { WebSocketService } from './websocket.service';
import { ConversationalAIEvents } from '../types/websocket.types';

export class ConversationalAIWebSocket extends WebSocketService {
  private audioContext?: AudioContext;
  private audioQueue: ArrayBuffer[] = [];
  private isPlaying = false;

  constructor(token: string, conversationId: string) {
    super('/ws/conversation', token, {
      query: { conversationId }
    });
  }

  async initialize(): Promise<void> {
    await this.connect();
    this.setupAudioContext();
    this.setupEventListeners();
  }

  private setupAudioContext() {
    this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  }

  private setupEventListeners() {
    const socket = this.getSocket();
    if (!socket) return;

    // Handle audio responses
    socket.on('audio_response', (chunk: ArrayBuffer) => {
      this.audioQueue.push(chunk);
      if (!this.isPlaying) {
        this.playAudioQueue();
      }
    });

    // Handle transcriptions
    socket.on('transcription', (event) => {
      console.log(`[${event.speaker}]: ${event.text}`);
    });
  }

  // Send audio chunk from microphone
  sendAudioChunk(chunk: ArrayBuffer): void {
    this.getSocket()?.emit('audio_chunk', { chunk });
  }

  // Send text input (fallback mode)
  sendTextInput(text: string): void {
    this.getSocket()?.emit('text_input', { text });
  }

  // End the conversation
  endConversation(): void {
    this.getSocket()?.emit('end_conversation');
  }

  // Audio playback
  private async playAudioQueue() {
    if (!this.audioContext || this.audioQueue.length === 0) {
      this.isPlaying = false;
      return;
    }

    this.isPlaying = true;
    const chunk = this.audioQueue.shift()!;

    try {
      const audioBuffer = await this.audioContext.decodeAudioData(chunk);
      const source = this.audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(this.audioContext.destination);
      
      source.onended = () => {
        this.playAudioQueue(); // Play next chunk
      };
      
      source.start();
    } catch (error) {
      console.error('Audio playback error:', error);
      this.isPlaying = false;
    }
  }

  // Event listeners
  onConversationStarted(callback: (data: any) => void) {
    this.getSocket()?.on('conversation_started', callback);
  }

  onTranscription(callback: (event: any) => void) {
    this.getSocket()?.on('transcription', callback);
  }

  onTextResponse(callback: (data: { text: string }) => void) {
    this.getSocket()?.on('text_response', callback);
  }

  onError(callback: (error: { message: string }) => void) {
    this.getSocket()?.on('error', callback);
  }

  onReconnecting(callback: (data: { attempt: number }) => void) {
    this.getSocket()?.on('reconnecting', callback);
  }

  onReconnected(callback: () => void) {
    this.getSocket()?.on('reconnected', callback);
  }
}
```

## React Component Examples

### Dream Interpretation Chat

```tsx
// components/DreamInterpretationChat.tsx
import React, { useState, useEffect } from 'react';
import { DreamInterpretationWebSocket } from '../services/dreamInterpretation.websocket';

interface Message {
  text: string;
  sender: 'user' | 'agent';
  timestamp: Date;
}

export const DreamInterpretationChat: React.FC<{
  dreamId: string;
  interpreterId: string;
  token: string;
}> = ({ dreamId, interpreterId, token }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isAgentTyping, setIsAgentTyping] = useState(false);
  const [websocket, setWebsocket] = useState<DreamInterpretationWebSocket | null>(null);

  useEffect(() => {
    const ws = new DreamInterpretationWebSocket(token);
    setWebsocket(ws);

    // Start conversation
    ws.startConversation({
      dreamId,
      interpreterId: interpreterId as any,
      userName: 'User'
    }).then(() => {
      // Setup event listeners
      ws.onMessageReceived((data) => {
        setMessages(prev => [...prev, {
          text: data.message,
          sender: 'agent',
          timestamp: data.timestamp
        }]);
      });

      ws.onAgentTyping((data) => {
        setIsAgentTyping(data.isTyping);
      });

      ws.onError((error) => {
        console.error('WebSocket error:', error);
      });
    });

    return () => {
      ws.disconnect();
    };
  }, [dreamId, interpreterId, token]);

  const sendMessage = () => {
    if (!input.trim() || !websocket) return;

    // Add user message
    setMessages(prev => [...prev, {
      text: input,
      sender: 'user',
      timestamp: new Date()
    }]);

    // Send to server
    websocket.sendMessage(input);
    setInput('');
  };

  return (
    <div className="chat-container">
      <div className="messages">
        {messages.map((msg, idx) => (
          <div key={idx} className={`message ${msg.sender}`}>
            <span className="text">{msg.text}</span>
            <span className="time">{msg.timestamp.toLocaleTimeString()}</span>
          </div>
        ))}
        {isAgentTyping && (
          <div className="typing-indicator">Agent is typing...</div>
        )}
      </div>
      
      <div className="input-area">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
          placeholder="Type your message..."
        />
        <button onClick={sendMessage}>Send</button>
      </div>
    </div>
  );
};
```

### Conversational AI Voice Chat

```tsx
// components/ConversationalAIVoiceChat.tsx
import React, { useState, useEffect, useRef } from 'react';
import { ConversationalAIWebSocket } from '../services/conversationalAI.websocket';

export const ConversationalAIVoiceChat: React.FC<{
  conversationId: string;
  token: string;
}> = ({ conversationId, token }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState<Array<{text: string; speaker: string}>>([]);
  const [mode, setMode] = useState<'voice' | 'text'>('voice');
  const [textInput, setTextInput] = useState('');
  const websocketRef = useRef<ConversationalAIWebSocket | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);

  useEffect(() => {
    const ws = new ConversationalAIWebSocket(token, conversationId);
    websocketRef.current = ws;

    ws.initialize().then(() => {
      // Setup event listeners
      ws.onConversationStarted((data) => {
        console.log('Conversation started:', data);
        setMode(data.mode);
      });

      ws.onTranscription((event) => {
        if (event.isFinal) {
          setTranscript(prev => [...prev, {
            text: event.text,
            speaker: event.speaker
          }]);
        }
      });

      ws.onTextResponse((data) => {
        // In text mode, add agent responses
        if (mode === 'text') {
          setTranscript(prev => [...prev, {
            text: data.text,
            speaker: 'agent'
          }]);
        }
      });

      ws.onError((error) => {
        console.error('WebSocket error:', error);
        // Fallback to text mode
        setMode('text');
      });
    });

    return () => {
      ws.disconnect();
    };
  }, [conversationId, token]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = async (event) => {
        if (event.data.size > 0 && websocketRef.current) {
          const arrayBuffer = await event.data.arrayBuffer();
          websocketRef.current.sendAudioChunk(arrayBuffer);
        }
      };

      mediaRecorder.start(100); // Send chunks every 100ms
      setIsRecording(true);
    } catch (error) {
      console.error('Microphone access error:', error);
      setMode('text'); // Fallback to text
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      setIsRecording(false);
    }
  };

  const sendTextMessage = () => {
    if (!textInput.trim() || !websocketRef.current) return;

    // Add to transcript
    setTranscript(prev => [...prev, {
      text: textInput,
      speaker: 'user'
    }]);

    // Send to server
    websocketRef.current.sendTextInput(textInput);
    setTextInput('');
  };

  return (
    <div className="voice-chat-container">
      <div className="transcript">
        {transcript.map((item, idx) => (
          <div key={idx} className={`transcript-item ${item.speaker}`}>
            <span className="speaker">{item.speaker}:</span>
            <span className="text">{item.text}</span>
          </div>
        ))}
      </div>

      {mode === 'voice' ? (
        <div className="voice-controls">
          <button
            className={`record-button ${isRecording ? 'recording' : ''}`}
            onMouseDown={startRecording}
            onMouseUp={stopRecording}
            onTouchStart={startRecording}
            onTouchEnd={stopRecording}
          >
            {isRecording ? 'Recording...' : 'Hold to Talk'}
          </button>
        </div>
      ) : (
        <div className="text-controls">
          <input
            type="text"
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && sendTextMessage()}
            placeholder="Type your message..."
          />
          <button onClick={sendTextMessage}>Send</button>
        </div>
      )}

      <button onClick={() => websocketRef.current?.endConversation()}>
        End Conversation
      </button>
    </div>
  );
};
```

## Communication Flow

### Dream Interpretation Flow

1. **Connection**: Client connects to `/ws/dream` namespace with JWT token
2. **Start Conversation**: Client emits `startConversation` with dream details
3. **Server Response**: Server emits `conversationStarted` with session info
4. **Message Exchange**: 
   - Client emits `sendMessage`
   - Server emits `agentTyping` (optional)
   - Server emits `messageReceived` with response
5. **End**: Client emits `endConversation`, server emits `conversationEnded`

### Conversational AI Flow

1. **Connection**: Client connects to `/ws/conversation` with JWT token and conversation ID
2. **Initialization**: Server emits `conversation_started` with greeting and mode
3. **Voice Mode**:
   - Client streams audio chunks via `audio_chunk`
   - Server emits `transcription` events (real-time)
   - Server streams back `audio_response` chunks
4. **Text Mode** (fallback):
   - Client emits `text_input`
   - Server emits `text_response`
5. **End**: Client emits `end_conversation`

## Error Handling

Always implement proper error handling:

```typescript
websocket.onError((error) => {
  if (error.code === 'AUTH_FAILED') {
    // Redirect to login
  } else if (error.code === 'CONVERSATION_NOT_FOUND') {
    // Show error message
  } else {
    // Generic error handling
  }
});
```

## Best Practices

1. **Token Management**: Store JWT token securely (httpOnly cookies or secure storage)
2. **Reconnection**: Implement exponential backoff for reconnection attempts
3. **Audio Permissions**: Request microphone access only when needed
4. **Fallback**: Always provide text input as fallback for voice mode
5. **State Management**: Use Redux/Context for managing WebSocket state across components
6. **Cleanup**: Always disconnect WebSocket on component unmount
7. **Loading States**: Show appropriate loading indicators during connection
8. **Error Boundaries**: Wrap WebSocket components in error boundaries

## Environment Variables

```env
REACT_APP_API_URL=http://localhost:3000
```

For production:
```env
REACT_APP_API_URL=https://your-api-domain.com
```