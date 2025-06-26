import { Server as HTTPServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { JungConversationalAgent } from '../agents/jung-conversational.agent';
import { LakshmiConversationalAgent } from '../agents/lakshmi-conversational.agent';
import { BaseConversationalAgent } from '../agents/base/base-conversational-agent';
import { ConversationContext } from '../types/conversation.types';
import { conversationService } from '../services/conversation.service';
import { logger } from '../../utils/logger';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  conversationId?: string;
  agent?: BaseConversationalAgent;
}

export class ConversationalAIWebSocketServer {
  private io: SocketIOServer;
  private agents: Map<string, BaseConversationalAgent> = new Map();

  constructor(httpServer: HTTPServer) {
    this.io = new SocketIOServer(httpServer, {
      cors: {
        origin: process.env.FRONTEND_URL || 'http://localhost:3000',
        credentials: true
      },
      path: '/ws/conversation'
    });

    this.setupMiddleware();
    this.setupEventHandlers();
  }

  private setupMiddleware(): void {
    // Authentication middleware
    this.io.use(async (socket: AuthenticatedSocket, next) => {
      try {
        const token = socket.handshake.auth.token;
        if (!token) {
          return next(new Error('Authentication required'));
        }

        // Verify JWT token
        const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
        socket.userId = decoded.userId;
        socket.conversationId = socket.handshake.query.conversationId as string;

        if (!socket.conversationId) {
          return next(new Error('Conversation ID required'));
        }

        next();
      } catch (error) {
        logger.error('WebSocket authentication failed:', error);
        next(new Error('Authentication failed'));
      }
    });
  }

  private setupEventHandlers(): void {
    this.io.on('connection', async (socket: AuthenticatedSocket) => {
      logger.info(`User ${socket.userId} connected to conversation ${socket.conversationId}`);

      try {
        // Initialize conversation
        await this.handleConnection(socket);

        // Audio streaming
        socket.on('audio_chunk', async (data) => {
          await this.handleAudioChunk(socket, data);
        });

        // Text input (fallback)
        socket.on('text_input', async (data) => {
          await this.handleTextInput(socket, data);
        });

        // End conversation
        socket.on('end_conversation', async () => {
          await this.handleEndConversation(socket);
        });

        // Disconnect
        socket.on('disconnect', () => {
          this.handleDisconnect(socket);
        });

        // Error handling
        socket.on('error', (error) => {
          logger.error('WebSocket error:', error);
          socket.emit('error', { message: 'An error occurred' });
        });

      } catch (error) {
        logger.error('Connection setup failed:', error);
        socket.emit('error', { message: 'Failed to initialize conversation' });
        socket.disconnect();
      }
    });
  }

  private async handleConnection(socket: AuthenticatedSocket): Promise<void> {
    try {
      // Get conversation details
      const conversation = await conversationService.getConversation(socket.conversationId!);
      if (!conversation) {
        throw new Error('Conversation not found');
      }

      // Create appropriate agent
      const agent = this.createAgent(conversation.interpreterId);
      socket.agent = agent;
      this.agents.set(socket.conversationId!, agent);

      // Initialize ElevenLabs connection
      const elevenLabsService = await agent.initializeConversation(socket.conversationId!);

      // Set up ElevenLabs event forwarding
      elevenLabsService.on('audio', (chunk) => {
        socket.emit('audio_response', chunk);
      });

      elevenLabsService.on('transcription', (event) => {
        socket.emit('transcription', event);
      });

      elevenLabsService.on('agent_response', (response) => {
        socket.emit('agent_response', response);
      });

      elevenLabsService.on('vad_score', (score) => {
        socket.emit('vad_score', score);
      });

      elevenLabsService.on('conversation_initiated', (metadata) => {
        socket.emit('conversation_metadata', metadata);
      });

      elevenLabsService.on('error', (error) => {
        socket.emit('error', error);
      });

      // Get conversation context
      const context = await conversationService.getConversationContext(socket.conversationId!);

      // Send conversation starter
      const starter = agent.getConversationStarter(context);
      socket.emit('conversation_started', {
        message: starter,
        interpreter: conversation.interpreterId
      });

      // For MVP, also send as text transcription
      socket.emit('transcription', {
        text: starter,
        speaker: 'agent',
        timestamp: Date.now(),
        isFinal: true
      });

    } catch (error) {
      logger.error('Failed to handle connection:', error);
      throw error;
    }
  }

  private createAgent(interpreterId: string): BaseConversationalAgent {
    switch (interpreterId) {
      case 'jung':
        return new JungConversationalAgent();
      case 'lakshmi':
        return new LakshmiConversationalAgent();
      default:
        throw new Error(`Unknown interpreter: ${interpreterId}`);
    }
  }

  private async handleAudioChunk(socket: AuthenticatedSocket, data: any): Promise<void> {
    try {
      if (!socket.agent) {
        throw new Error('Agent not initialized');
      }

      // Forward audio to ElevenLabs
      const elevenLabsService = socket.agent['elevenLabsService'];
      if (elevenLabsService && elevenLabsService.isActive()) {
        elevenLabsService.sendAudio(data.chunk);
      } else {
        // MVP fallback: process as text
        logger.warn('ElevenLabs not active, falling back to text processing');
        socket.emit('error', { message: 'Audio processing unavailable, please use text input' });
      }

    } catch (error) {
      logger.error('Failed to handle audio chunk:', error);
      socket.emit('error', { message: 'Failed to process audio' });
    }
  }

  private async handleTextInput(socket: AuthenticatedSocket, data: any): Promise<void> {
    try {
      if (!socket.agent || !socket.conversationId) {
        throw new Error('Agent or conversation not initialized');
      }

      const { text } = data;

      // Save user message
      await conversationService.saveMessage({
        conversationId: socket.conversationId,
        role: 'user',
        content: text
      });

      // Get updated context
      const context = await conversationService.getConversationContext(socket.conversationId);

      // Generate response
      const response = await socket.agent.handleConversationTurn(text, context);

      // Save agent response
      await conversationService.saveMessage({
        conversationId: socket.conversationId,
        role: 'assistant',
        content: response
      });

      // Send response
      socket.emit('text_response', { text: response });
      socket.emit('transcription', {
        text: response,
        speaker: 'agent',
        timestamp: Date.now(),
        isFinal: true
      });

    } catch (error) {
      logger.error('Failed to handle text input:', error);
      socket.emit('error', { message: 'Failed to generate response' });
    }
  }

  private async handleEndConversation(socket: AuthenticatedSocket): Promise<void> {
    try {
      if (!socket.conversationId) return;

      // Clean up agent
      if (socket.agent) {
        await socket.agent.cleanup();
        this.agents.delete(socket.conversationId);
      }

      // Update conversation status
      await conversationService.endConversation(socket.conversationId);

      socket.emit('conversation_ended', {
        conversationId: socket.conversationId
      });

      socket.disconnect();

    } catch (error) {
      logger.error('Failed to end conversation:', error);
      socket.emit('error', { message: 'Failed to end conversation properly' });
    }
  }

  private handleDisconnect(socket: AuthenticatedSocket): void {
    logger.info(`User ${socket.userId} disconnected from conversation ${socket.conversationId}`);

    // Clean up agent if needed
    if (socket.conversationId && socket.agent) {
      socket.agent.cleanup().catch(error => {
        logger.error('Failed to cleanup agent:', error);
      });
      this.agents.delete(socket.conversationId);
    }
  }

  public getIO(): SocketIOServer {
    return this.io;
  }
}

// Factory function
export function createConversationalAIWebSocketServer(httpServer: HTTPServer): ConversationalAIWebSocketServer {
  return new ConversationalAIWebSocketServer(httpServer);
}