/**
 * WebSocket Handler for Real-time Conversations
 * Manages WebSocket connections for dream interpretation conversations
 */

import { Server as HTTPServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import { logger } from '../../utils/logger';
import { conversationOrchestrator } from '../services/conversation-orchestrator';
import { InterpreterType } from '../types';

interface ClientToServerEvents {
  // Start a new conversation
  startConversation: (data: {
    dreamId: string;
    interpreterId: InterpreterType;
    dreamInterpretation?: string;
    userName?: string;
    initialMessage?: string;
  }) => void;
  
  // Send a message in active conversation
  sendMessage: (data: {
    message: string;
  }) => void;
  
  // End the conversation
  endConversation: () => void;
  
  // Typing indicator
  typing: (data: {
    isTyping: boolean;
  }) => void;
}

interface ServerToClientEvents {
  // Conversation started
  conversationStarted: (data: {
    sessionId: string;
    conversationId: string;
    interpreterId: InterpreterType;
  }) => void;
  
  // Agent response
  agentResponse: (data: {
    response: string;
    metadata?: {
      turnNumber: number;
      tokensUsed: number;
      contextWindowUsage: number;
      suggestedFollowUps?: string[];
    };
  }) => void;
  
  // Conversation ended
  conversationEnded: (data: {
    reason: 'user' | 'timeout' | 'error';
    summary?: string;
  }) => void;
  
  // Error event
  error: (data: {
    code: string;
    message: string;
  }) => void;
  
  // Agent typing indicator
  agentTyping: (data: {
    isTyping: boolean;
  }) => void;
  
  // Connection status
  connectionStatus: (data: {
    status: 'connected' | 'disconnected' | 'reconnecting';
  }) => void;
}

interface SocketData {
  userId: string;
  sessionId?: string;
  conversationId?: string;
}

export class WebSocketHandler {
  private io: SocketIOServer;
  private activeSockets: Map<string, Socket> = new Map();
  
  constructor(httpServer: HTTPServer) {
    this.io = new SocketIOServer(httpServer, {
      cors: {
        origin: process.env.NODE_ENV === 'production' 
          ? process.env.FRONTEND_URL 
          : ['http://localhost:3000', 'http://localhost:3001'],
        credentials: true
      },
      pingTimeout: 60000,
      pingInterval: 25000
    });
    
    this.setupMiddleware();
    this.setupEventHandlers();
    this.setupOrchestratorListeners();
    
    logger.info('WebSocket handler initialized');
  }
  
  /**
   * Setup authentication middleware
   */
  private setupMiddleware(): void {
    this.io.use(async (socket, next) => {
      try {
        // Extract authentication token
        const token = socket.handshake.auth.token;
        
        if (!token) {
          return next(new Error('Authentication required'));
        }
        
        // Verify token and get user info
        // TODO: Implement actual token verification
        const userId = await this.verifyToken(token);
        
        if (!userId) {
          return next(new Error('Invalid authentication token'));
        }
        
        // Store user info in socket data
        (socket.data as SocketData).userId = userId;
        
        next();
      } catch (error) {
        logger.error('WebSocket authentication error', {
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        
        next(new Error('Authentication failed'));
      }
    });
  }
  
  /**
   * Setup WebSocket event handlers
   */
  private setupEventHandlers(): void {
    this.io.on('connection', (socket: Socket<ClientToServerEvents, ServerToClientEvents>) => {
      const userId = (socket.data as SocketData).userId;
      
      logger.info('WebSocket client connected', {
        socketId: socket.id,
        userId
      });
      
      // Store socket reference
      this.activeSockets.set(socket.id, socket);
      
      // Send connection confirmation
      socket.emit('connectionStatus', { status: 'connected' });
      
      // Handle start conversation
      socket.on('startConversation', async (data) => {
        await this.handleStartConversation(socket, data);
      });
      
      // Handle send message
      socket.on('sendMessage', async (data) => {
        await this.handleSendMessage(socket, data);
      });
      
      // Handle end conversation
      socket.on('endConversation', async () => {
        await this.handleEndConversation(socket);
      });
      
      // Handle typing indicator
      socket.on('typing', (data) => {
        this.handleTyping(socket, data);
      });
      
      // Handle disconnect
      socket.on('disconnect', async (reason) => {
        await this.handleDisconnect(socket, reason);
      });
      
      // Handle errors
      socket.on('error', (error) => {
        logger.error('WebSocket error', {
          socketId: socket.id,
          error: error.message
        });
      });
    });
  }
  
  /**
   * Setup conversation orchestrator event listeners
   */
  private setupOrchestratorListeners(): void {
    // Listen for orchestrator events
    conversationOrchestrator.on('sessionStarted', (data) => {
      const socket = this.findSocketBySessionId(data.sessionId);
      if (socket) {
        socket.emit('conversationStarted', {
          sessionId: data.sessionId,
          conversationId: data.conversationId,
          interpreterId: data.interpreterId
        });
      }
    });
    
    conversationOrchestrator.on('messageProcessed', (data) => {
      const socket = this.findSocketBySessionId(data.sessionId);
      if (socket) {
        // Simulate typing delay
        socket.emit('agentTyping', { isTyping: true });
        
        setTimeout(() => {
          socket.emit('agentTyping', { isTyping: false });
        }, 500);
      }
    });
    
    conversationOrchestrator.on('sessionEnded', (data) => {
      const socket = this.findSocketBySessionId(data.sessionId);
      if (socket) {
        socket.emit('conversationEnded', {
          reason: 'user',
          summary: `Conversation completed with ${data.turnCount} exchanges.`
        });
      }
    });
  }
  
  /**
   * Handle start conversation event
   */
  private async handleStartConversation(
    socket: Socket<ClientToServerEvents, ServerToClientEvents>,
    data: Parameters<ClientToServerEvents['startConversation']>[0]
  ): Promise<void> {
    try {
      const userId = (socket.data as SocketData).userId;
      const sessionId = `session_${socket.id}_${Date.now()}`;
      
      // Store session ID in socket data
      (socket.data as SocketData).sessionId = sessionId;
      
      // Start conversation
      const session = await conversationOrchestrator.startConversation({
        userId,
        dreamId: data.dreamId,
        interpreterId: data.interpreterId as InterpreterType,
        conversationId: sessionId
      });
      
      // Store conversation ID
      (socket.data as SocketData).conversationId = session.conversationId;
      
      // If initial message was provided, the response will come through orchestrator events
      if (!data.initialMessage) {
        socket.emit('conversationStarted', {
          sessionId: session.id,
          conversationId: session.conversationId,
          interpreterId: session.interpreterId as InterpreterType
        });
      }
      
    } catch (error) {
      logger.error('Failed to start conversation', {
        socketId: socket.id,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      socket.emit('error', {
        code: 'START_CONVERSATION_FAILED',
        message: error instanceof Error ? error.message : 'Failed to start conversation'
      });
    }
  }
  
  /**
   * Handle send message event
   */
  private async handleSendMessage(
    socket: Socket<ClientToServerEvents, ServerToClientEvents>,
    data: Parameters<ClientToServerEvents['sendMessage']>[0]
  ): Promise<void> {
    try {
      const sessionId = (socket.data as SocketData).sessionId;
      
      if (!sessionId) {
        socket.emit('error', {
          code: 'NO_ACTIVE_SESSION',
          message: 'No active conversation session'
        });
        return;
      }
      
      // Show agent typing
      socket.emit('agentTyping', { isTyping: true });
      
      // Process message
      const response = await conversationOrchestrator.processMessage(
        sessionId,
        data.message
      );
      
      // Stop typing indicator
      socket.emit('agentTyping', { isTyping: false });
      
      // Send response
      socket.emit('agentResponse', {
        response: response,
        metadata: {
          turnNumber: 1,
          tokensUsed: 0,
          contextWindowUsage: 0
        }
      });
      
    } catch (error) {
      logger.error('Failed to process message', {
        socketId: socket.id,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      socket.emit('agentTyping', { isTyping: false });
      
      socket.emit('error', {
        code: 'MESSAGE_PROCESSING_FAILED',
        message: error instanceof Error ? error.message : 'Failed to process message'
      });
    }
  }
  
  /**
   * Handle end conversation event
   */
  private async handleEndConversation(
    socket: Socket<ClientToServerEvents, ServerToClientEvents>
  ): Promise<void> {
    try {
      const sessionId = (socket.data as SocketData).sessionId;
      
      if (!sessionId) {
        return;
      }
      
      // End conversation
      await conversationOrchestrator.endConversation(sessionId);
      
      // Clear session data
      (socket.data as SocketData).sessionId = undefined;
      (socket.data as SocketData).conversationId = undefined;
      
      socket.emit('conversationEnded', {
        reason: 'user'
      });
      
    } catch (error) {
      logger.error('Failed to end conversation', {
        socketId: socket.id,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
  
  /**
   * Handle typing indicator
   */
  private handleTyping(
    socket: Socket,
    data: Parameters<ClientToServerEvents['typing']>[0]
  ): void {
    // Could broadcast to other participants if needed
    // For now, just acknowledge
  }
  
  /**
   * Handle client disconnect
   */
  private async handleDisconnect(
    socket: Socket,
    reason: string
  ): Promise<void> {
    logger.info('WebSocket client disconnected', {
      socketId: socket.id,
      reason
    });
    
    // End any active conversation
    const sessionId = (socket.data as SocketData).sessionId;
    if (sessionId) {
      try {
        await conversationOrchestrator.endConversation(sessionId);
      } catch (error) {
        logger.error('Error ending conversation on disconnect', {
          sessionId,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
    
    // Remove socket reference
    this.activeSockets.delete(socket.id);
  }
  
  /**
   * Find socket by session ID
   */
  private findSocketBySessionId(sessionId: string): Socket | undefined {
    for (const [_, socket] of this.activeSockets) {
      if ((socket.data as SocketData).sessionId === sessionId) {
        return socket;
      }
    }
    return undefined;
  }
  
  /**
   * Verify authentication token
   */
  private async verifyToken(token: string): Promise<string | null> {
    // TODO: Implement actual token verification
    // For now, just extract user ID from token
    try {
      // This is a placeholder - implement actual JWT verification
      const parts = token.split('.');
      if (parts.length === 3) {
        const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
        return payload.userId || payload.sub || null;
      }
      return null;
    } catch (error) {
      return null;
    }
  }
  
  /**
   * Broadcast to all connected clients
   */
  broadcast(event: string, data: any): void {
    this.io.emit(event, data);
  }
  
  /**
   * Get connected clients count
   */
  getConnectedClientsCount(): number {
    return this.activeSockets.size;
  }
  
  /**
   * Shutdown WebSocket server
   */
  async shutdown(): Promise<void> {
    logger.info('Shutting down WebSocket server');
    
    // Close all active conversations
    for (const [_, socket] of this.activeSockets) {
      const sessionId = (socket.data as SocketData).sessionId;
      if (sessionId) {
        try {
          await conversationOrchestrator.endConversation(sessionId);
        } catch (error) {
          logger.error('Error ending conversation during shutdown', {
            sessionId,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }
    }
    
    // Close all connections
    this.io.close();
  }
}

// Export factory function
export function createWebSocketHandler(httpServer: HTTPServer): WebSocketHandler {
  return new WebSocketHandler(httpServer);
}