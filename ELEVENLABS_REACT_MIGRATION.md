# ElevenLabs React SDK Migration Guide

## Overview
This guide details migrating from backend WebSocket proxy to frontend ElevenLabs React SDK for direct communication.

## Architecture Change

### Current (Backend Proxy):
```
Frontend ↔ Socket.IO ↔ Backend ↔ ElevenLabs WebSocket
```

### New (Direct Frontend):
```
Frontend ↔ ElevenLabs React SDK ↔ ElevenLabs API
Backend ↔ REST API for auth, variables, message storage
```

## Backend Implementation

### 1. New API Endpoints

#### `/api/v1/conversations/elevenlabs/init`
**Purpose:** Initialize ElevenLabs conversation with dynamic variables and session token

```typescript
// Route: src/routes/elevenlabs.ts
import { Router } from 'express';
import { isAuthenticated } from '../middleware/auth';

const router = Router();
router.use(isAuthenticated);

router.post('/init', async (req, res) => {
  try {
    const { dreamId, interpreterId } = req.body;
    const userId = req.user.id;
    
    // 1. Find or create conversation
    const conversation = await conversationService.findOrCreateConversation({
      userId,
      dreamId,
      interpreterId
    });
    
    // 2. Get conversation context and user profile
    const context = await conversationService.getConversationContext(conversation.id);
    const userProfile = await conversationService.getUserProfile(userId);
    
    // 3. Build dynamic variables
    const agent = createAgent(interpreterId);
    const dynamicVariables = await agent.buildDynamicVariables(context, userProfile);
    
    // 4. Create ElevenLabs session token (secure)
    const sessionToken = await createElevenLabsSessionToken({
      agentId: agent.elevenLabsAgentId,
      userId,
      conversationId: conversation.id,
      expiresIn: 3600 // 1 hour
    });
    
    res.json({
      success: true,
      data: {
        conversationId: conversation.id,
        agentId: agent.elevenLabsAgentId,
        sessionToken,
        dynamicVariables,
        isResumed: context.previousMessages.length > 0
      }
    });
    
  } catch (error) {
    logger.error('Failed to initialize ElevenLabs conversation:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to initialize conversation'
    });
  }
});
```

#### `/api/v1/conversations/messages`
**Purpose:** Store conversation messages from frontend

```typescript
router.post('/messages', async (req, res) => {
  try {
    const { conversationId, role, content, timestamp, metadata } = req.body;
    const userId = req.user.id;
    
    // Verify user owns conversation
    const conversation = await conversationService.getConversation(conversationId);
    if (!conversation || conversation.userId !== userId) {
      return res.status(403).json({ success: false, error: 'Unauthorized' });
    }
    
    // Save message
    const message = await conversationService.saveMessage({
      conversationId,
      role, // 'user' | 'assistant'
      content,
      timestamp: timestamp || Date.now(),
      metadata: metadata || {}
    });
    
    res.json({
      success: true,
      data: { messageId: message.id }
    });
    
  } catch (error) {
    logger.error('Failed to save message:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to save message'
    });
  }
});
```

#### `/api/v1/conversations/elevenlabs/refresh-token`
**Purpose:** Refresh session token for long conversations

```typescript
router.post('/refresh-token', async (req, res) => {
  try {
    const { conversationId } = req.body;
    const userId = req.user.id;
    
    // Verify conversation ownership
    const conversation = await conversationService.getConversation(conversationId);
    if (!conversation || conversation.userId !== userId) {
      return res.status(403).json({ success: false, error: 'Unauthorized' });
    }
    
    // Create new session token
    const sessionToken = await createElevenLabsSessionToken({
      agentId: conversation.agentId,
      userId,
      conversationId,
      expiresIn: 3600
    });
    
    res.json({
      success: true,
      data: { sessionToken }
    });
    
  } catch (error) {
    logger.error('Failed to refresh token:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to refresh token'
    });
  }
});
```

### 2. ElevenLabs Session Token Service

```typescript
// src/services/elevenlabs-auth.service.ts
import jwt from 'jsonwebtoken';
import { logger } from '../utils/logger';

interface SessionTokenPayload {
  agentId: string;
  userId: string;
  conversationId: string;
  expiresIn: number;
}

export async function createElevenLabsSessionToken(payload: SessionTokenPayload): Promise<string> {
  try {
    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) {
      throw new Error('ELEVENLABS_API_KEY not configured');
    }
    
    // Option A: Use ElevenLabs signed URL if supported
    if (process.env.ELEVENLABS_SUPPORTS_SIGNED_URLS === 'true') {
      const response = await fetch('https://api.elevenlabs.io/v1/convai/conversation/signed-url', {
        method: 'POST',
        headers: {
          'xi-api-key': apiKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          agent_id: payload.agentId,
          expires_in: payload.expiresIn
        })
      });
      
      if (!response.ok) {
        throw new Error(`ElevenLabs API error: ${response.status}`);
      }
      
      const data = await response.json();
      return data.signed_url;
    }
    
    // Option B: Create JWT with API key (for proxy auth)
    const token = jwt.sign(
      {
        agentId: payload.agentId,
        userId: payload.userId,
        conversationId: payload.conversationId,
        apiKey: apiKey // Encrypted in JWT
      },
      process.env.JWT_SECRET!,
      { expiresIn: payload.expiresIn }
    );
    
    return token;
    
  } catch (error) {
    logger.error('Failed to create ElevenLabs session token:', error);
    throw error;
  }
}
```

### 3. Remove WebSocket Handler (Optional)

```typescript
// Mark as deprecated in src/websocket/conversational-ai-handler.ts
export class ConversationalAIHandler {
  // Add deprecation notice
  handleConnection(socket: ConversationSocket): void {
    logger.warn('WebSocket conversational AI handler is deprecated - use ElevenLabs React SDK');
    // Keep existing logic for backward compatibility during migration
  }
}
```

## Frontend Implementation

### 1. Install Dependencies

```bash
npm install @elevenlabs/react @elevenlabs/client
```

### 2. ElevenLabs Provider Setup

```tsx
// src/providers/ElevenLabsProvider.tsx
import React, { createContext, useContext } from 'react';
import { ElevenLabsClient } from '@elevenlabs/client';

interface ElevenLabsContextType {
  client: ElevenLabsClient | null;
  initializeConversation: (dreamId: string, interpreterId: string) => Promise<ConversationSession>;
}

const ElevenLabsContext = createContext<ElevenLabsContextType | null>(null);

export function ElevenLabsProvider({ children }: { children: React.ReactNode }) {
  // Client will be initialized per conversation
  const [client, setClient] = React.useState<ElevenLabsClient | null>(null);
  
  const initializeConversation = async (dreamId: string, interpreterId: string) => {
    try {
      // 1. Get session data from backend
      const response = await fetch('/api/v1/conversations/elevenlabs/init', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dreamId, interpreterId })
      });
      
      if (!response.ok) throw new Error('Failed to initialize conversation');
      
      const { data } = await response.json();
      
      // 2. Create ElevenLabs client
      const elevenLabsClient = new ElevenLabsClient({
        apiKey: data.sessionToken, // Session token instead of raw API key
      });
      
      setClient(elevenLabsClient);
      
      // 3. Start conversation
      const conversation = await elevenLabsClient.conversation.startConversation({
        agentId: data.agentId,
        dynamicVariables: data.dynamicVariables
      });
      
      return {
        conversation,
        conversationId: data.conversationId,
        isResumed: data.isResumed
      };
      
    } catch (error) {
      console.error('Failed to initialize ElevenLabs conversation:', error);
      throw error;
    }
  };
  
  return (
    <ElevenLabsContext.Provider value={{ client, initializeConversation }}>
      {children}
    </ElevenLabsContext.Provider>
  );
}

export const useElevenLabs = () => {
  const context = useContext(ElevenLabsContext);
  if (!context) throw new Error('useElevenLabs must be used within ElevenLabsProvider');
  return context;
};
```

### 3. Conversation Hook

```tsx
// src/hooks/useConversation.ts
import { useState, useCallback, useRef } from 'react';
import { useElevenLabs } from '../providers/ElevenLabsProvider';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

export function useConversation() {
  const { initializeConversation } = useElevenLabs();
  const [conversation, setConversation] = useState<any>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const conversationIdRef = useRef<string | null>(null);
  
  const startConversation = useCallback(async (dreamId: string, interpreterId: string) => {
    try {
      const session = await initializeConversation(dreamId, interpreterId);
      conversationIdRef.current = session.conversationId;
      
      // Set up event listeners
      session.conversation.on('message', async (message: any) => {
        const newMessage: Message = {
          id: Date.now().toString(),
          role: message.source === 'agent' ? 'assistant' : 'user',
          content: message.text,
          timestamp: Date.now()
        };
        
        setMessages(prev => [...prev, newMessage]);
        
        // Save to backend
        await saveMessage(newMessage);
      });
      
      session.conversation.on('audio', (audioData: ArrayBuffer) => {
        // Handle audio playback
        playAudio(audioData);
      });
      
      session.conversation.on('connect', () => {
        setIsConnected(true);
      });
      
      session.conversation.on('disconnect', () => {
        setIsConnected(false);
      });
      
      setConversation(session.conversation);
      
    } catch (error) {
      console.error('Failed to start conversation:', error);
      throw error;
    }
  }, [initializeConversation]);
  
  const saveMessage = async (message: Message) => {
    try {
      await fetch('/api/v1/conversations/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId: conversationIdRef.current,
          role: message.role,
          content: message.content,
          timestamp: message.timestamp
        })
      });
    } catch (error) {
      console.error('Failed to save message:', error);
    }
  };
  
  const startRecording = useCallback(() => {
    if (!conversation) return;
    setIsRecording(true);
    conversation.startRecording();
  }, [conversation]);
  
  const stopRecording = useCallback(() => {
    if (!conversation) return;
    setIsRecording(false);
    conversation.stopRecording();
  }, [conversation]);
  
  const sendText = useCallback(async (text: string) => {
    if (!conversation) return;
    await conversation.sendText(text);
  }, [conversation]);
  
  return {
    startConversation,
    startRecording,
    stopRecording,
    sendText,
    messages,
    isConnected,
    isRecording
  };
}
```

### 4. React Component

```tsx
// src/components/ConversationChat.tsx
import React from 'react';
import { useConversation } from '../hooks/useConversation';

interface ConversationChatProps {
  dreamId: string;
  interpreterId: string;
}

export function ConversationChat({ dreamId, interpreterId }: ConversationChatProps) {
  const {
    startConversation,
    startRecording,
    stopRecording,
    sendText,
    messages,
    isConnected,
    isRecording
  } = useConversation();
  
  React.useEffect(() => {
    startConversation(dreamId, interpreterId);
  }, [dreamId, interpreterId]);
  
  return (
    <div className="conversation-chat">
      <div className="messages">
        {messages.map(message => (
          <div key={message.id} className={`message ${message.role}`}>
            <strong>{message.role === 'user' ? 'You' : 'Dr. Jung'}:</strong>
            <p>{message.content}</p>
          </div>
        ))}
      </div>
      
      <div className="controls">
        <button
          onMouseDown={startRecording}
          onMouseUp={stopRecording}
          disabled={!isConnected}
          className={`record-button ${isRecording ? 'recording' : ''}`}
        >
          {isRecording ? 'Recording...' : 'Hold to Talk'}
        </button>
        
        <div className="status">
          Status: {isConnected ? 'Connected' : 'Disconnected'}
        </div>
      </div>
    </div>
  );
}
```

## Migration Timeline

### Phase 1 (2 days): Backend API
- [ ] Create ElevenLabs auth service
- [ ] Add conversation init endpoint
- [ ] Add message storage endpoint
- [ ] Test session token generation

### Phase 2 (3 days): Frontend Integration  
- [ ] Install ElevenLabs React SDK
- [ ] Create provider and hooks
- [ ] Build conversation component
- [ ] Test audio recording/playback

### Phase 3 (1 day): Integration Testing
- [ ] End-to-end conversation testing
- [ ] Message persistence verification
- [ ] Error handling validation

### Phase 4 (1 day): Cleanup
- [ ] Deprecate WebSocket handler
- [ ] Update documentation
- [ ] Performance optimization

## Security Considerations

1. **API Key Protection**: Never expose raw ElevenLabs API key to frontend
2. **Session Tokens**: Use JWT with short expiration (1 hour max)
3. **Conversation Ownership**: Always verify user owns conversation before operations
4. **Rate Limiting**: Apply rate limits to conversation init endpoints
5. **Token Refresh**: Implement automatic token refresh for long conversations

## Benefits of Migration

1. **Reliability**: Direct connection eliminates WebSocket proxy issues
2. **Performance**: No audio/transcript relay through backend
3. **Simplicity**: Fewer moving parts in architecture
4. **Real-time**: Better latency for audio streaming
5. **Maintainability**: Leverage official ElevenLabs SDK updates