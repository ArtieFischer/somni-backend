/**
 * Dream Interpretation WebSocket Handler
 * Handles dream interpretation WebSocket events for the unified server
 */

import { Socket } from 'socket.io';
import { conversationOrchestrator } from '../services/conversation-orchestrator';
import { InterpreterType } from '../types';
import { logger } from '../../utils/logger';

interface SocketData {
  userId: string;
  sessionId?: string;
  conversationId?: string;
}

interface ClientToServerEvents {
  startConversation: (data: {
    dreamId: string;
    interpreterId: string;
    dreamInterpretation?: any;
    userName?: string;
    initialMessage?: string;
  }) => void;
  sendMessage: (data: { message: string }) => void;
  endConversation: () => void;
  typing: (data: { isTyping: boolean }) => void;
}

interface ServerToClientEvents {
  connectionStatus: (data: { status: string }) => void;
  conversationStarted: (data: {
    sessionId: string;
    conversationId: string;
    interpreterId: InterpreterType;
  }) => void;
  messageReceived: (data: any) => void;
  agentTyping: (data: { isTyping: boolean }) => void;
  conversationEnded: (data: { reason: string; summary?: string }) => void;
  error: (data: { code: string; message: string }) => void;
}

export class DreamInterpretationHandler {
  private activeSessions: Map<string, string> = new Map(); // sessionId -> socketId
  
  constructor() {
    this.setupOrchestratorListeners();
  }

  /**
   * Handle new socket connection
   */
  handleConnection(socket: Socket<ClientToServerEvents, ServerToClientEvents>): void {
    const userId = (socket.data as SocketData)?.userId;
    
    logger.info('Dream interpretation client connected', {
      socketId: socket.id,
      userId
    });
    
    // Send connection confirmation
    socket.emit('connectionStatus', { status: 'connected' });
    
    // Register event handlers
    socket.on('startConversation', async (data) => {
      await this.handleStartConversation(socket, data);
    });
    
    socket.on('sendMessage', async (data) => {
      await this.handleSendMessage(socket, data);
    });
    
    socket.on('endConversation', async () => {
      await this.handleEndConversation(socket);
    });
    
    socket.on('typing', (data) => {
      this.handleTyping(socket, data);
    });
    
    socket.on('disconnect', async (reason) => {
      await this.handleDisconnect(socket, reason);
    });
    
    socket.on('error', (error) => {
      logger.error('WebSocket error', {
        socketId: socket.id,
        error: error.message
      });
    });
  }
  
  /**
   * Setup conversation orchestrator event listeners
   */
  private setupOrchestratorListeners(): void {
    conversationOrchestrator.on('sessionStarted', (data) => {
      // Note: In namespace implementation, we don't have direct access to sockets
      // This would need to be refactored to emit through the namespace
      logger.info('Session started event received', data);
    });
    
    conversationOrchestrator.on('messageProcessed', (data) => {
      logger.info('Message processed event received', data);
    });
    
    conversationOrchestrator.on('sessionEnded', (data) => {
      logger.info('Session ended event received', data);
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
      this.activeSessions.set(sessionId, socket.id);
      
      // Start conversation
      const session = await conversationOrchestrator.startConversation({
        userId,
        dreamId: data.dreamId,
        interpreterId: data.interpreterId as InterpreterType,
        conversationId: sessionId
      });
      
      // Store conversation ID
      (socket.data as SocketData).conversationId = session.conversationId;
      
      // Send response
      socket.emit('conversationStarted', {
        sessionId: session.id,
        conversationId: session.conversationId,
        interpreterId: session.interpreterId as InterpreterType
      });
      
      // If initial message provided, process it
      if (data.initialMessage) {
        await this.handleSendMessage(socket, { message: data.initialMessage });
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
      const conversationId = (socket.data as SocketData).conversationId;
      
      if (!sessionId || !conversationId) {
        throw new Error('No active conversation');
      }
      
      // Emit typing indicator
      socket.emit('agentTyping', { isTyping: true });
      
      // Process message
      const response = await conversationOrchestrator.processMessage(
        sessionId,
        data.message
      );
      
      // Stop typing indicator
      socket.emit('agentTyping', { isTyping: false });
      
      // Send response
      socket.emit('messageReceived', {
        message: response,
        timestamp: new Date()
      });
      
    } catch (error) {
      logger.error('Failed to send message', {
        socketId: socket.id,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      socket.emit('agentTyping', { isTyping: false });
      socket.emit('error', {
        code: 'SEND_MESSAGE_FAILED',
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
      const conversationId = (socket.data as SocketData).conversationId;
      
      if (sessionId) {
        await conversationOrchestrator.endConversation(sessionId);
        this.activeSessions.delete(sessionId);
      }
      
      socket.emit('conversationEnded', {
        reason: 'user',
        summary: 'Conversation ended by user'
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
    socket: Socket<ClientToServerEvents, ServerToClientEvents>,
    data: Parameters<ClientToServerEvents['typing']>[0]
  ): void {
    // For now, just log the typing status
    // In a real implementation, this could be broadcast to other participants
    logger.debug('Typing indicator', {
      socketId: socket.id,
      isTyping: data.isTyping
    });
  }
  
  /**
   * Handle socket disconnect
   */
  private async handleDisconnect(
    socket: Socket<ClientToServerEvents, ServerToClientEvents>,
    reason: string
  ): Promise<void> {
    logger.info('Dream interpretation client disconnected', {
      socketId: socket.id,
      reason
    });
    
    const sessionId = (socket.data as SocketData).sessionId;
    const conversationId = (socket.data as SocketData).conversationId;
    
    // Clean up conversation if exists
    if (sessionId) {
      try {
        await conversationOrchestrator.endConversation(sessionId);
        this.activeSessions.delete(sessionId);
      } catch (error) {
        logger.error('Failed to cleanup conversation on disconnect', {
          sessionId,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
  }
}