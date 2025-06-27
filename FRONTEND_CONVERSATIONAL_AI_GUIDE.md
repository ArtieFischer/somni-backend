# Frontend Conversational AI WebSocket Implementation Guide

## Step-by-Step Implementation

### Step 1: Install Dependencies

```bash
npm install socket.io-client
npm install --save-dev @types/socket.io-client  # if using TypeScript
```

### Step 2: Create WebSocket Manager (Core Service)

This is your foundation - a reusable WebSocket manager that can be extended for different features.

```typescript
// services/websocket/WebSocketManager.ts

import { io, Socket } from 'socket.io-client';

export interface WebSocketConfig {
  url: string;
  namespace: string;
  auth?: Record<string, any>;
  query?: Record<string, any>;
  reconnection?: boolean;
  reconnectionAttempts?: number;
  reconnectionDelay?: number;
}

export class WebSocketManager {
  protected socket: Socket | null = null;
  protected config: WebSocketConfig;
  private eventHandlers: Map<string, Function[]> = new Map();
  private isConnecting = false;

  constructor(config: WebSocketConfig) {
    this.config = {
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      ...config
    };
  }

  /**
   * Connect to WebSocket server
   */
  async connect(): Promise<void> {
    if (this.socket?.connected || this.isConnecting) {
      console.log('Already connected or connecting');
      return;
    }

    this.isConnecting = true;

    return new Promise((resolve, reject) => {
      const fullUrl = `${this.config.url}${this.config.namespace}`;
      
      this.socket = io(fullUrl, {
        auth: this.config.auth,
        query: this.config.query,
        transports: ['websocket', 'polling'],
        reconnection: this.config.reconnection,
        reconnectionAttempts: this.config.reconnectionAttempts,
        reconnectionDelay: this.config.reconnectionDelay,
      });

      // Core event handlers
      this.socket.on('connect', () => {
        console.log(`✅ Connected to ${this.config.namespace}`);
        this.isConnecting = false;
        this.onConnect();
        resolve();
      });

      this.socket.on('connect_error', (error) => {
        console.error(`❌ Connection error:`, error.message);
        this.isConnecting = false;
        this.onConnectError(error);
        reject(error);
      });

      this.socket.on('disconnect', (reason) => {
        console.log(`🔌 Disconnected:`, reason);
        this.onDisconnect(reason);
      });

      this.socket.on('error', (error) => {
        console.error(`❌ WebSocket error:`, error);
        this.onError(error);
      });

      // Set timeout for connection
      setTimeout(() => {
        if (!this.socket?.connected) {
          this.isConnecting = false;
          reject(new Error('Connection timeout'));
        }
      }, 10000); // 10 second timeout
    });
  }

  /**
   * Disconnect from server
   */
  disconnect(): void {
    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
    }
    this.eventHandlers.clear();
  }

  /**
   * Emit event to server
   */
  emit(event: string, data?: any): void {
    if (!this.socket?.connected) {
      console.error('Cannot emit - not connected');
      return;
    }
    this.socket.emit(event, data);
  }

  /**
   * Listen to server events
   */
  on(event: string, handler: Function): void {
    if (!this.socket) {
      console.error('Cannot attach listener - not connected');
      return;
    }

    // Store handler reference for cleanup
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, []);
    }
    this.eventHandlers.get(event)!.push(handler);

    // Attach to socket
    this.socket.on(event, handler as any);
  }

  /**
   * Remove event listener
   */
  off(event: string, handler?: Function): void {
    if (!this.socket) return;

    if (handler) {
      this.socket.off(event, handler as any);
      const handlers = this.eventHandlers.get(event);
      if (handlers) {
        const index = handlers.indexOf(handler);
        if (index > -1) handlers.splice(index, 1);
      }
    } else {
      // Remove all handlers for this event
      this.socket.off(event);
      this.eventHandlers.delete(event);
    }
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  // Override these in subclasses
  protected onConnect(): void {}
  protected onConnectError(error: Error): void {}
  protected onDisconnect(reason: string): void {}
  protected onError(error: any): void {}
}
```

### Step 3: Create Conversational AI Service

Extend the WebSocketManager for conversational AI specific functionality.

```typescript
// services/websocket/ConversationalAIService.ts

import { WebSocketManager } from './WebSocketManager';

export interface ConversationConfig {
  apiUrl: string;
  token: string;
  conversationId: string;
}

export interface TranscriptionEvent {
  text: string;
  speaker: 'user' | 'agent';
  timestamp: number;
  isFinal: boolean;
}

export interface ConversationCallbacks {
  onConversationStarted?: (data: any) => void;
  onTranscription?: (event: TranscriptionEvent) => void;
  onTextResponse?: (text: string) => void;
  onAudioResponse?: (chunk: ArrayBuffer) => void;
  onError?: (error: any) => void;
  onReconnecting?: (attempt: number) => void;
  onReconnected?: () => void;
  onConversationEnded?: () => void;
}

export class ConversationalAIService extends WebSocketManager {
  private callbacks: ConversationCallbacks = {};

  constructor(config: ConversationConfig) {
    super({
      url: config.apiUrl,
      namespace: '/ws/conversation',
      auth: { token: config.token },
      query: { conversationId: config.conversationId }
    });
  }

  /**
   * Initialize the service with callbacks
   */
  async initialize(callbacks: ConversationCallbacks): Promise<void> {
    this.callbacks = callbacks;
    await this.connect();
    this.setupEventListeners();
  }

  /**
   * Setup all event listeners
   */
  private setupEventListeners(): void {
    // Conversation lifecycle
    this.on('conversation_started', (data: any) => {
      console.log('Conversation started:', data);
      this.callbacks.onConversationStarted?.(data);
    });

    this.on('conversation_ended', (data: any) => {
      console.log('Conversation ended:', data);
      this.callbacks.onConversationEnded?.();
    });

    // Message handling
    this.on('transcription', (event: TranscriptionEvent) => {
      console.log(`[${event.speaker}]: ${event.text}`);
      this.callbacks.onTranscription?.(event);
    });

    this.on('text_response', (data: { text: string }) => {
      console.log('Text response:', data.text);
      this.callbacks.onTextResponse?.(data.text);
    });

    this.on('audio_response', (chunk: ArrayBuffer) => {
      console.log('Audio chunk received:', chunk.byteLength, 'bytes');
      this.callbacks.onAudioResponse?.(chunk);
    });

    // Connection status
    this.on('reconnecting', (data: { attempt: number }) => {
      console.log('Reconnecting...', data);
      this.callbacks.onReconnecting?.(data.attempt);
    });

    this.on('reconnected', () => {
      console.log('Reconnected!');
      this.callbacks.onReconnected?.();
    });
  }

  /**
   * Send text message
   */
  sendText(text: string): void {
    this.emit('text_input', { text });
  }

  /**
   * Send audio chunk
   */
  sendAudio(chunk: ArrayBuffer): void {
    this.emit('audio_chunk', { chunk });
  }

  /**
   * End the conversation
   */
  endConversation(): void {
    this.emit('end_conversation');
  }

  // Override base class methods
  protected onError(error: any): void {
    this.callbacks.onError?.(error);
  }

  protected onDisconnect(reason: string): void {
    if (reason === 'io server disconnect') {
      // Server disconnected us, probably authentication issue
      this.callbacks.onError?.({ 
        message: 'Server disconnected the connection',
        reason 
      });
    }
  }
}
```

### Step 4: Create Simple Test Component

A minimal component to test the connection and message exchange.

```tsx
// components/ConversationalAITest.tsx

import React, { useState, useEffect, useRef } from 'react';
import { ConversationalAIService } from '../services/websocket/ConversationalAIService';

interface Message {
  text: string;
  speaker: 'user' | 'agent' | 'system';
  timestamp: Date;
}

export const ConversationalAITest: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const serviceRef = useRef<ConversationalAIService | null>(null);

  // Configuration - replace with your actual values
  const config = {
    apiUrl: process.env.REACT_APP_API_URL || 'http://localhost:3000',
    token: 'YOUR_JWT_TOKEN_HERE', // Get this from your auth system
    conversationId: `test-${Date.now()}` // Generate unique ID
  };

  const addMessage = (text: string, speaker: Message['speaker']) => {
    setMessages(prev => [...prev, {
      text,
      speaker,
      timestamp: new Date()
    }]);
  };

  const connect = async () => {
    try {
      setIsConnecting(true);
      setError(null);
      
      const service = new ConversationalAIService(config);
      serviceRef.current = service;

      await service.initialize({
        onConversationStarted: (data) => {
          addMessage(`Conversation started: ${JSON.stringify(data)}`, 'system');
          setIsConnected(true);
        },
        
        onTranscription: (event) => {
          if (event.isFinal) {
            addMessage(event.text, event.speaker);
          }
        },
        
        onTextResponse: (text) => {
          addMessage(text, 'agent');
        },
        
        onError: (error) => {
          console.error('WebSocket error:', error);
          setError(error.message || 'Unknown error');
          addMessage(`Error: ${error.message}`, 'system');
        },
        
        onConversationEnded: () => {
          addMessage('Conversation ended', 'system');
          setIsConnected(false);
        }
      });

      addMessage('Connected to WebSocket server', 'system');
      setIsConnected(true);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Connection failed');
      addMessage(`Connection failed: ${err}`, 'system');
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnect = () => {
    if (serviceRef.current) {
      serviceRef.current.endConversation();
      serviceRef.current.disconnect();
      serviceRef.current = null;
      setIsConnected(false);
      addMessage('Disconnected', 'system');
    }
  };

  const sendMessage = () => {
    if (!inputText.trim() || !serviceRef.current || !isConnected) return;

    // Add user message
    addMessage(inputText, 'user');
    
    // Send to server
    serviceRef.current.sendText(inputText);
    
    // Clear input
    setInputText('');
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (serviceRef.current) {
        serviceRef.current.disconnect();
      }
    };
  }, []);

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <h1>Conversational AI WebSocket Test</h1>
      
      {/* Connection Status */}
      <div style={{ marginBottom: '20px' }}>
        <strong>Status:</strong> {
          isConnecting ? 'Connecting...' : 
          isConnected ? '🟢 Connected' : 
          '🔴 Disconnected'
        }
        {error && <div style={{ color: 'red' }}>Error: {error}</div>}
      </div>

      {/* Connection Controls */}
      <div style={{ marginBottom: '20px' }}>
        <button 
          onClick={connect} 
          disabled={isConnected || isConnecting}
          style={{ marginRight: '10px' }}
        >
          Connect
        </button>
        <button 
          onClick={disconnect} 
          disabled={!isConnected}
        >
          Disconnect
        </button>
      </div>

      {/* Messages */}
      <div style={{ 
        border: '1px solid #ccc', 
        height: '400px', 
        overflowY: 'auto',
        padding: '10px',
        marginBottom: '20px',
        backgroundColor: '#f5f5f5'
      }}>
        {messages.map((msg, idx) => (
          <div 
            key={idx} 
            style={{ 
              marginBottom: '10px',
              padding: '5px',
              backgroundColor: 
                msg.speaker === 'user' ? '#e3f2fd' :
                msg.speaker === 'agent' ? '#f3e5f5' :
                '#fff3e0',
              borderRadius: '5px'
            }}
          >
            <strong>{msg.speaker}:</strong> {msg.text}
            <small style={{ marginLeft: '10px', color: '#666' }}>
              {msg.timestamp.toLocaleTimeString()}
            </small>
          </div>
        ))}
      </div>

      {/* Input */}
      <div style={{ display: 'flex' }}>
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
          disabled={!isConnected}
          placeholder="Type a message..."
          style={{ 
            flex: 1, 
            padding: '10px',
            marginRight: '10px'
          }}
        />
        <button 
          onClick={sendMessage} 
          disabled={!isConnected || !inputText.trim()}
        >
          Send
        </button>
      </div>

      {/* Instructions */}
      <div style={{ marginTop: '20px', fontSize: '14px', color: '#666' }}>
        <h3>Test Instructions:</h3>
        <ol>
          <li>Replace YOUR_JWT_TOKEN_HERE with a valid JWT token</li>
          <li>Make sure the backend is running on {config.apiUrl}</li>
          <li>Click Connect to establish WebSocket connection</li>
          <li>Type a message and press Enter or click Send</li>
          <li>You should see responses from the AI agent</li>
        </ol>
      </div>
    </div>
  );
};
```

### Step 5: Integration Tips

#### 5.1 Environment Configuration

Create `.env` file:
```env
REACT_APP_API_URL=http://localhost:3000
```

#### 5.2 Token Management

Create a token provider:
```typescript
// services/auth/TokenProvider.ts
export class TokenProvider {
  private static token: string | null = null;

  static setToken(token: string): void {
    this.token = token;
    // Optionally store in localStorage/sessionStorage
    localStorage.setItem('auth_token', token);
  }

  static getToken(): string | null {
    if (!this.token) {
      this.token = localStorage.getItem('auth_token');
    }
    return this.token;
  }

  static clearToken(): void {
    this.token = null;
    localStorage.removeItem('auth_token');
  }
}
```

#### 5.3 React Context for Global State

```typescript
// contexts/ConversationalAIContext.tsx
import React, { createContext, useContext, useRef } from 'react';
import { ConversationalAIService } from '../services/websocket/ConversationalAIService';

interface ConversationalAIContextType {
  service: ConversationalAIService | null;
  connect: (conversationId: string) => Promise<void>;
  disconnect: () => void;
}

const ConversationalAIContext = createContext<ConversationalAIContextType | null>(null);

export const useConversationalAI = () => {
  const context = useContext(ConversationalAIContext);
  if (!context) {
    throw new Error('useConversationalAI must be used within ConversationalAIProvider');
  }
  return context;
};
```

### Step 6: Testing the Implementation

1. **Start the backend server**:
   ```bash
   cd somni-backend
   npm run dev:ws
   ```

2. **Get a valid JWT token**:
   - Login through your normal auth flow
   - Or create a test token for development

3. **Update the test component**:
   - Replace `YOUR_JWT_TOKEN_HERE` with actual token
   - Ensure API URL matches your backend

4. **Run the frontend**:
   ```bash
   npm start
   ```

5. **Test the connection**:
   - Click Connect
   - Send a test message
   - Verify you receive responses

### Best Practices for Production

1. **Error Recovery**
   ```typescript
   // Add to WebSocketManager
   private reconnectWithBackoff(): void {
     const delays = [1000, 2000, 5000, 10000, 30000];
     const delay = delays[Math.min(this.reconnectAttempts, delays.length - 1)];
     setTimeout(() => this.connect(), delay);
   }
   ```

2. **Message Queue**
   ```typescript
   // Queue messages when disconnected
   private messageQueue: Array<{event: string, data: any}> = [];
   
   emit(event: string, data?: any): void {
     if (!this.socket?.connected) {
       this.messageQueue.push({event, data});
       return;
     }
     this.socket.emit(event, data);
   }
   ```

3. **Connection State Management**
   ```typescript
   export enum ConnectionState {
     DISCONNECTED = 'disconnected',
     CONNECTING = 'connecting', 
     CONNECTED = 'connected',
     RECONNECTING = 'reconnecting',
     ERROR = 'error'
   }
   ```

4. **Cleanup and Memory Management**
   ```typescript
   // Always cleanup in useEffect
   useEffect(() => {
     return () => {
       serviceRef.current?.disconnect();
     };
   }, []);
   ```

5. **Type Safety**
   ```typescript
   // Define all event types
   type ServerToClientEvents = {
     conversation_started: (data: ConversationStartData) => void;
     transcription: (event: TranscriptionEvent) => void;
     // ... etc
   };
   ```

This modular approach allows you to:
- Easily extend for new features
- Reuse the WebSocketManager for other namespaces
- Test components in isolation
- Handle errors gracefully
- Scale to production