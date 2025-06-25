# ElevenLabs Conversational AI MVP - 1 Day Implementation Plan

## 🎯 **MVP Goals (8-10 hours)**
- Basic conversational AI integration with Jung interpreter only
- Post-dream interpretation conversations
- Simple context passing (dream interpretation + user name)
- Basic conversation storage
- Frontend voice interface

## 📋 **Hour-by-Hour Breakdown**

### **Hours 1-2: Schema Enhancement & Types Setup**

#### 1.1 Extend Existing Tables (Optional Enhancement)
```sql
-- supabase/migrations/20250624_conversational_ai_extensions.sql
-- OPTIONAL: Add ElevenLabs-specific columns to existing tables

-- Add ElevenLabs session tracking to conversations table
ALTER TABLE conversations 
ADD COLUMN IF NOT EXISTS elevenlabs_conversation_id text,
ADD COLUMN IF NOT EXISTS elevenlabs_agent_id text,
ADD COLUMN IF NOT EXISTS status text DEFAULT 'active' CHECK (status IN ('active', 'completed', 'failed')),
ADD COLUMN IF NOT EXISTS ended_at timestamptz,
ADD COLUMN IF NOT EXISTS conversation_summary text,
ADD COLUMN IF NOT EXISTS session_metadata jsonb DEFAULT '{}';

-- Add index for ElevenLabs conversation lookup
CREATE INDEX IF NOT EXISTS idx_conversations_elevenlabs_id 
ON conversations(elevenlabs_conversation_id) 
WHERE elevenlabs_conversation_id IS NOT NULL;

-- Note: The existing messages table already has everything we need:
-- - id, conversation_id, sender, content, created_at
-- - sender field supports 'user', 'interpreter', 'system' (perfect for our use)
-- - embedding vector for future context retrieval
```

**✅ EXISTING SCHEMA ANALYSIS:**
- **conversations table**: Already has user_id, interpreter_id, dream_id, started_at, last_message_at
- **messages table**: Already has conversation_id, sender, content, embedding, created_at  
- **RLS policies**: Already configured for user access control
- **Indexes**: Already optimized for conversation and message queries

**🎯 SCHEMA IS READY** - We can use the existing tables with minimal additions!

#### 1.2 Update Types (Work with Existing Schema)
```typescript
// src/types/conversation.ts - Aligned with existing database schema

export interface Conversation {
  id: string;
  user_id: string;
  interpreter_id: string | null;
  dream_id: string | null;
  started_at: string;
  last_message_at: string | null;
  
  // New ElevenLabs columns (after migration)
  elevenlabs_conversation_id?: string | null;
  elevenlabs_agent_id?: string | null;
  status?: 'active' | 'completed' | 'failed';
  ended_at?: string | null;
  conversation_summary?: string | null;
  session_metadata?: Record<string, any>;
}

export interface Message {
  id: number; // bigserial in existing schema
  conversation_id: string;
  sender: 'user' | 'interpreter' | 'system'; // matches existing constraint
  content: string;
  embedding?: number[]; // vector(384) in existing schema
  created_at: string;
}

export interface StartConversationRequest {
  interpreterId: string;
  dreamId?: string;
}

export interface StartConversationResponse {
  success: boolean;
  conversation: {
    id: string;
    signedUrl: string;
    agentId: string;
  };
  error?: string;
}

export interface ConversationContext {
  userName: string;
  dreamInterpretation?: string;
  dreamSymbols?: string[];
  interpretationDate?: string;
}

// Database query helpers
export interface ConversationWithMessages extends Conversation {
  messages: Message[];
}

export interface CreateConversationData {
  user_id: string;
  interpreter_id: string;
  dream_id?: string;
  elevenlabs_agent_id: string;
  session_metadata?: Record<string, any>;
}

export interface CreateMessageData {
  conversation_id: string;
  sender: 'user' | 'interpreter' | 'system';
  content: string;
}
```

### **Hours 3-4: Enhanced ElevenLabs Service**

#### 3.1 Update ElevenLabs Service (Based on Official SDK Documentation)
```typescript
// src/services/elevenlabs.ts (add to existing file)

interface AgentConfig {
  name: string;
  prompt: string;
  firstMessage: string;
  voiceId?: string;
  modelId?: string;
  language?: string;
}

interface ConversationStartConfig {
  interpreterId: string;
  userId: string;
  dreamId?: string;
  context: ConversationContext;
}

class ElevenLabsService {
  // ... existing methods ...
  
  // Store created agents to avoid recreation
  private agentCache = new Map<string, string>();

  private agentConfigs: Record<string, AgentConfig> = {
    jung: {
      name: "Dr. Carl Jung - Dream Guide",
      prompt: `You are Dr. Carl Jung, the renowned Swiss psychiatrist and psychoanalyst. You have just provided a detailed dream interpretation for the user and now you're having a follow-up conversation to explore the dream's deeper meanings.

CONVERSATION CONTEXT:
- User's name: {{user_name}}
- Dream interpretation already provided: {{dream_interpretation}}
- Key symbols identified: {{dream_symbols}}
- Interpretation date: {{interpretation_date}}

YOUR ROLE & APPROACH:
1. You've already analyzed their dream - now go deeper through dialogue
2. Ask thoughtful questions about personal associations with symbols
3. Explore how the dream relates to their individuation journey
4. Reference concepts like shadow, anima/animus, archetypes naturally
5. Guide them toward self-discovery through active reflection

CONVERSATION STYLE:
- Speak with measured wisdom and genuine curiosity
- Use phrases like "I'm curious about...", "What does this bring up for you?"
- Pause thoughtfully with "..." when reflecting
- Ask one primary question at a time
- Keep responses to 2-3 sentences to maintain conversational flow
- Show empathy and understanding

CURRENT FOCUS:
Engage them in exploring the personal meaning of their dream symbols and how this dream might be compensating for their conscious attitudes or revealing aspects of their unconscious.

Begin by asking about their immediate reaction to the interpretation or which symbol resonates most strongly.`,

      firstMessage: "I sense there's much more to explore in your dream. Looking at the interpretation I provided, what aspect resonates most deeply with you right now?",
      
      voiceId: "21m00Tcm4TlvDq8ikWAM", // Default voice - can be customized
      modelId: "eleven_multilingual_v2", // Use multilingual model for better quality
      language: "en"
    }
  };

  /**
   * Get or create ElevenLabs agent for interpreter (with caching)
   */
  async getOrCreateAgent(interpreterId: string, context: ConversationContext): Promise<string> {
    try {
      // Check cache first
      const cacheKey = `${interpreterId}_${context.userName}`;
      if (this.agentCache.has(cacheKey)) {
        return this.agentCache.get(cacheKey)!;
      }

      const config = this.agentConfigs[interpreterId];
      if (!config) {
        throw new Error(`No agent configuration found for interpreter: ${interpreterId}`);
      }

      // Replace context variables in prompt
      const personalizedPrompt = this.replacePromptVariables(config.prompt, context);
      const personalizedFirstMessage = this.replacePromptVariables(config.firstMessage, context);

      // Create agent using official SDK structure
      const agent = await this.client.conversationalAi.agents.create({
        conversationConfig: {
          agent: {
            prompt: {
              prompt: personalizedPrompt
            },
            firstMessage: personalizedFirstMessage,
            language: config.language || "en"
          },
          tts: {
            voiceId: config.voiceId
          }
        }
      });

      logger.info('Created ElevenLabs agent', { 
        interpreterId, 
        agentId: agent.agent_id,
        cacheKey
      });

      // Cache the agent ID
      this.agentCache.set(cacheKey, agent.agent_id);

      return agent.agent_id;
    } catch (error) {
      logger.error('Failed to create ElevenLabs agent', { 
        interpreterId, 
        error: error.message 
      });
      throw new Error('Failed to create conversational agent');
    }
  }

  /**
   * Start a conversation session with dynamic variables and overrides
   */
  async startConversationSession(config: ConversationStartConfig): Promise<{
    signedUrl: string;
    agentId: string;
    conversationId?: string;
  }> {
    try {
      // Get or create agent with personalized context
      const agentId = await this.getOrCreateAgent(config.interpreterId, config.context);

      // Get signed URL for secure WebSocket connection
      const signedUrlResponse = await this.client.conversationalAi.conversations.getSignedUrl({
        agentId: agentId
      });

      logger.info('Started conversation session', {
        userId: config.userId,
        interpreterId: config.interpreterId,
        dreamId: config.dreamId,
        agentId,
        signedUrl: signedUrlResponse.signed_url ? 'obtained' : 'failed'
      });

      return {
        signedUrl: signedUrlResponse.signed_url,
        agentId,
        conversationId: undefined // Will be set when WebSocket connects
      };
    } catch (error) {
      logger.error('Failed to start conversation session', {
        error: error.message,
        config: {
          ...config,
          context: { userName: config.context.userName } // Don't log full context
        }
      });
      throw error;
    }
  }

  /**
   * List conversations for monitoring/debugging
   */
  async listConversations(limit = 10): Promise<any[]> {
    try {
      const conversations = await this.client.conversationalAi.conversations.list({
        pageSize: limit
      });
      return conversations.conversations || [];
    } catch (error) {
      logger.error('Failed to list conversations', { error: error.message });
      return [];
    }
  }

  /**
   * Get conversation details (for post-conversation analysis)
   */
  async getConversationDetails(conversationId: string): Promise<any> {
    try {
      const conversation = await this.client.conversationalAi.conversations.get(conversationId);
      return conversation;
    } catch (error) {
      logger.error('Failed to get conversation details', { 
        error: error.message, 
        conversationId 
      });
      throw error;
    }
  }

  /**
   * Delete conversation (cleanup)
   */
  async deleteConversation(conversationId: string): Promise<void> {
    try {
      await this.client.conversationalAi.conversations.delete(conversationId);
      logger.info('Deleted conversation', { conversationId });
    } catch (error) {
      logger.error('Failed to delete conversation', { 
        error: error.message, 
        conversationId 
      });
    }
  }

  /**
   * Clear agent cache (for development/testing)
   */
  clearAgentCache(): void {
    this.agentCache.clear();
    logger.info('Agent cache cleared');
  }

  /**
   * Replace template variables in agent prompt/messages
   */
  private replacePromptVariables(text: string, context: ConversationContext): string {
    return text
      .replace(/\{\{user_name\}\}/g, context.userName || 'friend')
      .replace(/\{\{dream_interpretation\}\}/g, context.dreamInterpretation || 'a meaningful dream')
      .replace(/\{\{dream_symbols\}\}/g, context.dreamSymbols?.join(', ') || 'various symbols')
      .replace(/\{\{interpretation_date\}\}/g, context.interpretationDate || 'recently');
  }

  /**
   * Health check for conversational AI service
   */
  async checkConversationalHealth(): Promise<{ status: 'healthy' | 'unhealthy'; details?: string }> {
    try {
      // Test by listing agents
      await this.client.conversationalAi.agents.list();
      return { status: 'healthy' };
    } catch (error) {
      logger.warn('Conversational AI health check failed', { error: error.message });
      return { 
        status: 'unhealthy', 
        details: error.message || 'Service unavailable' 
      };
    }
  }
}
```

#### 3.2 Create Conversation Service
```typescript
// src/services/conversation.ts
import { supabase } from '../config/supabase';
import { elevenLabsService } from './elevenlabs';
import { logger } from '../utils/logger';
import type { ConversationSession, ConversationContext, StartConversationRequest } from '../types/conversation';

class ConversationService {
  
  /**
   * Build conversation context from user data
   */
  async buildConversationContext(userId: string, dreamId?: string): Promise<ConversationContext> {
    try {
      // Get user name
      const { data: profile } = await supabase
        .from('profiles')
        .select('username, handle')
        .eq('user_id', userId)
        .single();

      const userName = profile?.username || profile?.handle || 'friend';

      // Get dream interpretation if dreamId provided
      let dreamContext = {};
      if (dreamId) {
        // Get dream and its most recent interpretation
        const { data: dream } = await supabase
          .from('dreams')
          .select(`
            id,
            title,
            raw_transcript,
            created_at
          `)
          .eq('id', dreamId)
          .single();

        if (dream) {
          // Get the most recent interpretation for this dream
          // Note: Adjust this query based on your actual interpretations table structure
          const { data: interpretations } = await supabase
            .from('interpretations') // Or whatever your interpretations table is called
            .select('*')
            .eq('dream_id', dreamId)
            .order('created_at', { ascending: false })
            .limit(1);

          if (interpretations?.[0]) {
            const interpretation = interpretations[0];
            
            dreamContext = {
              dreamInterpretation: this.formatInterpretationForContext(interpretation),
              dreamSymbols: interpretation.symbols || [],
              interpretationDate: new Date(interpretation.created_at).toLocaleDateString()
            };
          }
        }
      }

      return {
        userName,
        ...dreamContext
      };
    } catch (error) {
      logger.error('Failed to build conversation context', { error, userId, dreamId });
      return { userName: 'friend' };
    }
  }

  /**
   * Start a new conversation
   */
  async startConversation(userId: string, request: StartConversationRequest): Promise<{
    id: string;
    signedUrl: string;
    agentId: string;
  }> {
    try {
      // Build context
      const context = await this.buildConversationContext(userId, request.dreamId);

      // Start ElevenLabs session
      const sessionData = await elevenLabsService.startConversationSession({
        interpreterId: request.interpreterId,
        userId,
        dreamId: request.dreamId,
        context
      });

      // Store conversation in database using existing schema
      const { data: conversation, error } = await supabase
        .from('conversations')
        .insert({
          user_id: userId,
          interpreter_id: request.interpreterId,
          dream_id: request.dreamId,
          elevenlabs_agent_id: sessionData.agentId,
          session_metadata: { context }
        })
        .select()
        .single();

      if (error) throw error;

      logger.info('Conversation started', {
        conversationId: conversation.id,
        userId,
        interpreterId: request.interpreterId
      });

      return {
        id: conversation.id,
        signedUrl: sessionData.signedUrl,
        agentId: sessionData.agentId
      };
    } catch (error) {
      logger.error('Failed to start conversation', { error, userId, request });
      throw error;
    }
  }

  /**
   * Store conversation message
   */
  async storeMessage(conversationId: string, messageType: 'user' | 'agent' | 'system', content: string): Promise<void> {
    try {
      await supabase
        .from('conversation_messages')
        .insert({
          conversation_id: conversationId,
          message_type: messageType,
          content
        });
    } catch (error) {
      logger.error('Failed to store message', { error, conversationId, messageType });
    }
  }

  /**
   * End conversation and generate summary
   */
  async endConversation(conversationId: string): Promise<void> {
    try {
      // Get all messages
      const { data: messages } = await supabase
        .from('conversation_messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('timestamp');

      // Simple summary for MVP
      const summary = messages?.length 
        ? `Conversation with ${messages.length} messages exchanged`
        : 'Brief conversation';

      // Update conversation
      await supabase
        .from('conversations')
        .update({
          status: 'completed',
          ended_at: new Date().toISOString(),
          conversation_summary: summary
        })
        .eq('id', conversationId);

      logger.info('Conversation ended', { conversationId });
    } catch (error) {
      logger.error('Failed to end conversation', { error, conversationId });
    }
  }

  /**
   * Format interpretation for context (simplified for MVP)
   */
  private formatInterpretationForContext(interpretation: any): string {
    if (interpretation.interpretation) {
      return interpretation.interpretation.substring(0, 500) + '...';
    }
    if (interpretation.coreMessage) {
      return interpretation.coreMessage;
    }
    return 'A meaningful dream interpretation was provided';
  }
}

export const conversationService = new ConversationService();
```

### **Hours 5-6: API Routes**

#### 5.1 Create Conversation Routes
```typescript
// src/routes/conversation.ts
import express, { Request, Response } from 'express';
import { authenticateRequest } from '../middleware/auth';
import { conversationService } from '../services/conversation';
import { logger } from '../utils/logger';
import type { StartConversationRequest } from '../types/conversation';

const router = express.Router();

/**
 * POST /api/v1/conversation/start
 * Start a new conversation session
 */
router.post('/start', authenticateRequest, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const request: StartConversationRequest = req.body;

    // Validate request
    if (!request.interpreterId) {
      return res.status(400).json({
        success: false,
        error: 'interpreterId is required'
      });
    }

    // For MVP, only support Jung
    if (request.interpreterId !== 'jung') {
      return res.status(400).json({
        success: false,
        error: 'Only Jung interpreter is supported in MVP'
      });
    }

    const conversation = await conversationService.startConversation(userId, request);

    res.json({
      success: true,
      conversation
    });

  } catch (error) {
    logger.error('Failed to start conversation', { 
      error: error.message, 
      userId: req.user?.id,
      body: req.body
    });
    
    res.status(500).json({
      success: false,
      error: 'Failed to start conversation'
    });
  }
});

/**
 * POST /api/v1/conversation/:id/message
 * Store a conversation message
 */
router.post('/:id/message', authenticateRequest, async (req: Request, res: Response) => {
  try {
    const { id: conversationId } = req.params;
    const { messageType, content } = req.body;

    if (!messageType || !content) {
      return res.status(400).json({
        success: false,
        error: 'messageType and content are required'
      });
    }

    await conversationService.storeMessage(conversationId, messageType, content);

    res.json({ success: true });

  } catch (error) {
    logger.error('Failed to store message', { 
      error: error.message, 
      conversationId: req.params.id 
    });
    
    res.status(500).json({
      success: false,
      error: 'Failed to store message'
    });
  }
});

/**
 * POST /api/v1/conversation/:id/end
 * End a conversation
 */
router.post('/:id/end', authenticateRequest, async (req: Request, res: Response) => {
  try {
    const { id: conversationId } = req.params;

    await conversationService.endConversation(conversationId);

    res.json({ success: true });

  } catch (error) {
    logger.error('Failed to end conversation', { 
      error: error.message, 
      conversationId: req.params.id 
    });
    
    res.status(500).json({
      success: false,
      error: 'Failed to end conversation'
    });
  }
});

/**
 * GET /api/v1/conversation/:id/messages
 * Get conversation messages
 */
router.get('/:id/messages', authenticateRequest, async (req: Request, res: Response) => {
  try {
    const { id: conversationId } = req.params;

    const { data: messages, error } = await supabase
      .from('conversation_messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('timestamp');

    if (error) throw error;

    res.json({
      success: true,
      messages
    });

  } catch (error) {
    logger.error('Failed to get messages', { 
      error: error.message, 
      conversationId: req.params.id 
    });
    
    res.status(500).json({
      success: false,
      error: 'Failed to get messages'
    });
  }
});

export default router;
```

#### 5.2 Update Main Router
```typescript
// src/app.ts (add to existing routes)
import conversationRouter from './routes/conversation';

// Add after existing routes
app.use('/api/v1/conversation', conversationRouter);
```

### **Hours 7-8: Frontend Components**

#### 7.1 Install Frontend Dependencies
```bash
# In your frontend directory
npm install @elevenlabs/react @elevenlabs/client
```

#### 7.2 Create Conversation Hook (Using Latest ElevenLabs React SDK)
```typescript
// src/hooks/useConversationSession.ts
import { useState, useCallback } from 'react';
import { useConversation } from '@elevenlabs/react';

interface ConversationSessionConfig {
  interpreterId: string;
  dreamId?: string;
  onConversationStart?: () => void;
  onConversationEnd?: () => void;
  onError?: (error: any) => void;
}

export function useConversationSession(config: ConversationSessionConfig) {
  const [conversationId, setConversationId] = useState<string>();
  const [isStarting, setIsStarting] = useState(false);
  const [error, setError] = useState<string>();
  const [messages, setMessages] = useState<Array<{sender: string, content: string, timestamp: Date}>>([]);

  const conversation = useConversation({
    onConnect: () => {
      console.log('Connected to conversation');
      config.onConversationStart?.();
    },
    onDisconnect: () => {
      console.log('Disconnected from conversation');
      handleConversationEnd();
    },
    onMessage: (message) => {
      console.log('Agent message received:', message);
      
      // Add to local messages state
      const newMessage = {
        sender: 'interpreter',
        content: message.message,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, newMessage]);
      
      // Store message in backend
      if (conversationId) {
        storeMessage('interpreter', message.message);
      }
    },
    onUserTranscript: (transcript) => {
      console.log('User transcript:', transcript);
      
      // Add to local messages state
      const newMessage = {
        sender: 'user',
        content: transcript,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, newMessage]);
      
      // Store message in backend
      if (conversationId) {
        storeMessage('user', transcript);
      }
    },
    onError: (error) => {
      console.error('Conversation error:', error);
      setError(error.message || 'Conversation error occurred');
      config.onError?.(error);
    },
    onModeChange: (mode) => {
      console.log('Conversation mode changed:', mode);
      // mode.mode can be 'speaking' or 'listening'
    }
  });

  const startConversation = useCallback(async () => {
    setIsStarting(true);
    setError(undefined);
    setMessages([]);

    try {
      // Request microphone permission
      await navigator.mediaDevices.getUserMedia({ audio: true });

      // Start conversation on backend
      const response = await fetch('/api/v1/conversation/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getAuthToken()}` // Your auth token method
        },
        body: JSON.stringify({
          interpreterId: config.interpreterId,
          dreamId: config.dreamId
        })
      });

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to start conversation');
      }

      setConversationId(data.conversation.id);

      // Start ElevenLabs session with signed URL
      await conversation.startSession({
        signedUrl: data.conversation.signedUrl
      });

    } catch (error: any) {
      console.error('Failed to start conversation:', error);
      setError(error.message || 'Failed to start conversation');
    } finally {
      setIsStarting(false);
    }
  }, [config.interpreterId, config.dreamId, conversation]);

  const endConversation = useCallback(async () => {
    if (conversation.status === 'connected') {
      await conversation.endSession();
    }
  }, [conversation]);

  const handleConversationEnd = async () => {
    if (conversationId) {
      try {
        await fetch(`/api/v1/conversation/${conversationId}/end`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${getAuthToken()}`
          }
        });
        config.onConversationEnd?.();
      } catch (error) {
        console.error('Failed to end conversation:', error);
      }
    }
  };

  const storeMessage = async (sender: 'user' | 'interpreter' | 'system', content: string) => {
    if (!conversationId) return;

    try {
      await fetch(`/api/v1/conversation/${conversationId}/message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getAuthToken()}`
        },
        body: JSON.stringify({
          sender, // Use 'sender' to match existing messages table
          content
        })
      });
    } catch (error) {
      console.error('Failed to store message:', error);
    }
  };

  // Manual message sending (for future text input support)
  const sendMessage = useCallback(async (message: string) => {
    if (conversationId) {
      const newMessage = {
        sender: 'user',
        content: message,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, newMessage]);
      await storeMessage('user', message);
    }
  }, [conversationId]);

  return {
    conversation,
    conversationId,
    isStarting,
    error,
    messages,
    startConversation,
    endConversation,
    sendMessage,
    // Expose useful status info
    isConnected: conversation.status === 'connected',
    isSpeaking: conversation.isSpeaking
  };
}

// Helper function - replace with your actual auth method
function getAuthToken(): string {
  // Replace with your actual auth token retrieval logic
  // This could be from localStorage, a auth context, etc.
  return localStorage.getItem('auth_token') || 
         sessionStorage.getItem('auth_token') || 
         '';
}
```

#### 7.3 Create Main Conversation Component
```typescript
// src/components/ConversationInterface.tsx
import React from 'react';
import { useConversationSession } from '../hooks/useConversationSession';

interface ConversationInterfaceProps {
  interpreterId: string;
  dreamId?: string;
  onConversationComplete?: () => void;
}

export function ConversationInterface({ 
  interpreterId, 
  dreamId, 
  onConversationComplete 
}: ConversationInterfaceProps) {
  
  const {
    conversation,
    isStarting,
    error,
    startConversation,
    endConversation
  } = useConversationSession({
    interpreterId,
    dreamId,
    onConversationEnd: onConversationComplete
  });

  const getInterpreterInfo = () => {
    switch (interpreterId) {
      case 'jung':
        return {
          name: 'Dr. Carl Jung',
          description: 'Explore deeper meanings with the renowned psychoanalyst',
          avatar: '/interpreters/jung.jpg'
        };
      default:
        return {
          name: 'Dream Guide',
          description: 'Explore your dreams further',
          avatar: '/interpreters/default.jpg'
        };
    }
  };

  const interpreterInfo = getInterpreterInfo();

  return (
    <div className="conversation-interface">
      <div className="interpreter-header">
        <img 
          src={interpreterInfo.avatar} 
          alt={interpreterInfo.name}
          className="interpreter-avatar"
        />
        <div className="interpreter-info">
          <h3>{interpreterInfo.name}</h3>
          <p>{interpreterInfo.description}</p>
        </div>
      </div>

      {error && (
        <div className="error-message">
          <p>Error: {error}</p>
        </div>
      )}

      <div className="conversation-controls">
        {conversation.status === 'disconnected' ? (
          <button 
            onClick={startConversation}
            disabled={isStarting}
            className="start-conversation-btn"
          >
            {isStarting ? 'Starting Conversation...' : `Talk with ${interpreterInfo.name}`}
          </button>
        ) : (
          <div className="conversation-active">
            <div className="status-indicators">
              <div className="connection-status">
                Status: {conversation.status}
              </div>
              <div className="speaking-indicator">
                {conversation.isSpeaking ? (
                  <span className="speaking">🔊 Speaking...</span>
                ) : (
                  <span className="listening">👂 Listening...</span>
                )}
              </div>
            </div>
            
            <button 
              onClick={endConversation}
              className="end-conversation-btn"
            >
              End Conversation
            </button>
          </div>
        )}
      </div>

      <div className="conversation-tips">
        <h4>Conversation Tips:</h4>
        <ul>
          <li>Speak clearly and at a normal pace</li>
          <li>Allow pauses for the interpreter to respond</li>
          <li>Feel free to ask questions about your dream symbols</li>
          <li>Share personal associations with dream elements</li>
        </ul>
      </div>
    </div>
  );
}
```

#### 7.4 Create CSS Styles
```css
/* src/components/ConversationInterface.css */
.conversation-interface {
  max-width: 500px;
  margin: 0 auto;
  padding: 20px;
  border-radius: 12px;
  background: #f9f9f9;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.interpreter-header {
  display: flex;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 15px;
  border-bottom: 1px solid #e0e0e0;
}

.interpreter-avatar {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  margin-right: 15px;
  object-fit: cover;
}

.interpreter-info h3 {
  margin: 0;
  color: #333;
  font-size: 1.2em;
}

.interpreter-info p {
  margin: 5px 0 0 0;
  color: #666;
  font-size: 0.9em;
}

.error-message {
  background: #fee;
  border: 1px solid #fcc;
  border-radius: 6px;
  padding: 10px;
  margin-bottom: 15px;
  color: #c33;
}

.conversation-controls {
  text-align: center;
  margin-bottom: 20px;
}

.start-conversation-btn {
  background: #4CAF50;
  color: white;
  border: none;
  padding: 12px 24px;
  border-radius: 6px;
  font-size: 1em;
  cursor: pointer;
  transition: background 0.3s;
}

.start-conversation-btn:hover:not(:disabled) {
  background: #45a049;
}

.start-conversation-btn:disabled {
  background: #cccccc;
  cursor: not-allowed;
}

.conversation-active {
  text-align: center;
}

.status-indicators {
  margin-bottom: 15px;
}

.connection-status {
  margin-bottom: 10px;
  font-weight: bold;
  color: #333;
}

.speaking-indicator .speaking {
  color: #ff6b35;
  animation: pulse 1.5s infinite;
}

.speaking-indicator .listening {
  color: #4CAF50;
}

@keyframes pulse {
  0% { opacity: 1; }
  50% { opacity: 0.5; }
  100% { opacity: 1; }
}

.end-conversation-btn {
  background: #f44336;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.3s;
}

.end-conversation-btn:hover {
  background: #d32f2f;
}

.conversation-tips {
  margin-top: 20px;
  padding-top: 15px;
  border-top: 1px solid #e0e0e0;
}

.conversation-tips h4 {
  margin: 0 0 10px 0;
  color: #333;
  font-size: 1em;
}

.conversation-tips ul {
  margin: 0;
  padding-left: 20px;
  color: #666;
  font-size: 0.9em;
}

.conversation-tips li {
  margin-bottom: 5px;
}
```

### **Hours 9-10: Integration & Testing**

#### 9.1 Update Existing Dream Interpretation Flow
```typescript
// Add to your existing dream interpretation results component
import { ConversationInterface } from './ConversationInterface';

// In your dream interpretation results:
<div className="interpretation-results">
  {/* Existing interpretation display */}
  
  {/* Add conversation interface */}
  <div className="conversation-section">
    <h3>Continue the Conversation</h3>
    <p>Dive deeper into your dream's meaning with Dr. Jung</p>
    <ConversationInterface 
      interpreterId="jung"
      dreamId={dreamId}
      onConversationComplete={() => {
        console.log('Conversation completed');
        // Optional: navigate to conversation history or show feedback
      }}
    />
  </div>
</div>
```

#### 9.2 Environment Variables
```bash
# Add to .env
ELEVENLABS_API_KEY=your_elevenlabs_api_key_here
```

#### 9.3 Test Checklist
- [ ] Database migration runs successfully
- [ ] ElevenLabs agent creation works
- [ ] Conversation start API returns signed URL
- [ ] Frontend can connect to ElevenLabs WebSocket
- [ ] Voice conversation flows correctly
- [ ] Messages are stored in database
- [ ] Conversation ends properly
- [ ] Error handling works for common failures

#### 9.4 MVP Testing Script
```typescript
// src/scripts/test-conversation-mvp.ts
import { elevenLabsService } from '../services/elevenlabs';
import { conversationService } from '../services/conversation';

async function testConversationMVP() {
  try {
    console.log('🧪 Testing ElevenLabs Conversation MVP...');
    
    // Test 1: Agent creation
    console.log('1. Testing agent creation...');
    const agentId = await elevenLabsService.getOrCreateAgent('jung');
    console.log('✅ Agent created:', agentId);
    
    // Test 2: Context building
    console.log('2. Testing context building...');
    const context = await conversationService.buildConversationContext('test-user-id');
    console.log('✅ Context built:', context);
    
    // Test 3: Conversation start
    console.log('3. Testing conversation start...');
    const session = await conversationService.startConversation('test-user-id', {
      interpreterId: 'jung'
    });
    console.log('✅ Conversation started:', session.id);
    
    console.log('🎉 MVP tests passed!');
    
  } catch (error) {
    console.error('❌ MVP test failed:', error);
  }
}

// Run: npm run test:conversation-mvp
```

## 🚀 **Deployment Checklist**

### Pre-deployment
- [ ] Run database migration
- [ ] Set ElevenLabs API key in environment
- [ ] Test conversation flow end-to-end
- [ ] Verify error handling and logging

### Post-deployment
- [ ] Monitor ElevenLabs API usage and costs
- [ ] Check conversation storage is working
- [ ] Verify voice quality and latency
- [ ] Test on different browsers/devices

## 📊 **Success Metrics for MVP**

1. **Technical**: Conversation starts successfully 90%+ of the time
2. **User Experience**: Voice conversation flows naturally without significant delays
3. **Data**: Conversations and messages are properly stored
4. **Cost**: ElevenLabs usage stays within expected limits

## 🔄 **Post-MVP Roadmap**

1. **Week 2**: Add other interpreters (Freud, Mary, Lakshmi)
2. **Week 3**: Add RAG integration for dynamic knowledge
3. **Week 4**: Add conversation history and analytics
4. **Week 5**: Add conversation insights and summaries
5. **Week 6**: Add voice customization and advanced features

## 🐛 **Common Issues & Solutions**

### Issue: ElevenLabs WebSocket connection fails
**Solution**: Check API key, ensure HTTPS in production, verify signed URL is valid

### Issue: Voice quality is poor
**Solution**: Check microphone permissions, test different voice IDs, ensure good internet connection

### Issue: Agent responses are generic
**Solution**: Improve prompt engineering, add more context variables, test different conversation flows

### Issue: High latency in responses
**Solution**: Check ElevenLabs region settings, optimize prompt length, monitor network conditions

This plan provides a complete 1-day MVP implementation that will give you a working conversational AI system with Jung as the initial interpreter, ready for expansion to other interpreters and advanced features.