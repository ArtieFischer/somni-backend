/**
 * Conversational AI WebSocket Handler
 * Handles all conversational AI WebSocket events using namespace approach
 */

import { Socket } from 'socket.io';
import { JungConversationalAgent } from '../agents/jung-conversational.agent';
import { LakshmiConversationalAgent } from '../agents/lakshmi-conversational.agent';
import { BaseConversationalAgent } from '../agents/base/base-conversational-agent';
import { conversationService } from '../services/conversation.service';
import { logger } from '../../utils/logger';

interface ConversationSocket extends Socket {
  userId?: string;
  conversationId?: string;
  agent?: BaseConversationalAgent;
}

export class ConversationalAIHandler {
  private agents: Map<string, BaseConversationalAgent> = new Map();

  /**
   * Handle new socket connection
   */
  handleConnection(socket: ConversationSocket): void {
    // Get user ID from socket data (set by auth middleware)
    socket.userId = (socket as any).data?.user?.id || (socket as any).data?.user?.userId;
    
    if (!socket.userId) {
      socket.emit('error', { message: 'Authentication required' });
      socket.disconnect();
      return;
    }

    // Check if conversationId is provided in query (existing conversation)
    const conversationId = socket.handshake.query.conversationId as string;
    
    if (conversationId) {
      socket.conversationId = conversationId;
      // Initialize existing conversation
      this.initializeConversation(socket)
        .catch(error => {
          logger.error('Failed to initialize conversation:', error);
          socket.emit('error', { message: 'Failed to initialize conversation' });
          socket.disconnect();
        });
    }

    // Setup event listeners (including initialize_conversation for new conversations)
    this.setupEventListeners(socket);
  }

  /**
   * Initialize conversation and agent
   */
  private async initializeConversation(socket: ConversationSocket): Promise<void> {
    const conversationId = socket.conversationId!;
    
    // Get conversation details
    const conversation = await conversationService.getConversation(conversationId);
    if (!conversation) {
      throw new Error('Conversation not found');
    }

    // Verify user owns conversation
    if (conversation.userId !== socket.userId) {
      throw new Error('Unauthorized');
    }

    // Get user profile for dynamic variables
    const userProfile = await conversationService.getUserProfile(conversation.userId);

    // Create appropriate agent
    const agent = this.createAgent(conversation.interpreterId);
    socket.agent = agent;
    this.agents.set(conversationId, agent);

    // Get conversation context first (needed for ElevenLabs initialization)
    const context = await conversationService.getConversationContext(conversationId);

    // Initialize ElevenLabs connection with context and user profile
    try {
      const elevenLabsService = await agent.initializeConversation(conversationId, context, userProfile);
      this.setupElevenLabsForwarding(socket, elevenLabsService);
    } catch (error) {
      logger.warn('ElevenLabs initialization failed, falling back to text mode:', error);
    }

    // Send conversation starter
    const starter = agent.getConversationStarter(context);
    socket.emit('conversation_started', {
      message: starter,
      interpreter: conversation.interpreterId,
      mode: socket.agent['elevenLabsService'] ? 'voice' : 'text'
    });

    // Also emit as transcription for compatibility
    socket.emit('transcription', {
      text: starter,
      speaker: 'agent',
      timestamp: Date.now(),
      isFinal: true
    });
  }

  /**
   * Setup Socket.IO event listeners
   */
  private setupEventListeners(socket: ConversationSocket): void {
    // Initialize new conversation
    socket.on('initialize_conversation', async (data) => {
      await this.handleInitializeConversation(socket, data);
    });

    // Audio streaming
    socket.on('audio_chunk', async (data) => {
      await this.handleAudioChunk(socket, data);
    });

    // Text input (fallback)
    socket.on('text_input', async (data) => {
      await this.handleTextInput(socket, data);
    });

    // Send audio (alternative event name)
    socket.on('send_audio', async (data) => {
      await this.handleAudioChunk(socket, data);
    });

    // Send text (alternative event name)
    socket.on('send_text', async (data) => {
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
      logger.error('Socket error:', error);
      socket.emit('error', { message: 'An error occurred' });
    });
  }

  /**
   * Setup ElevenLabs event forwarding
   */
  private setupElevenLabsForwarding(socket: ConversationSocket, elevenLabsService: any): void {
    elevenLabsService.on('audio', (chunk: any) => {
      socket.emit('audio_response', chunk);
    });

    elevenLabsService.on('transcription', (event: any) => {
      socket.emit('transcription', event);
      // Save transcription to database
      if (event.isFinal) {
        conversationService.saveMessage({
          conversationId: socket.conversationId!,
          role: event.speaker === 'user' ? 'user' : 'assistant',
          content: event.text
        }).catch(err => logger.error('Failed to save transcription:', err));
      }
    });

    elevenLabsService.on('agent_response', (response: any) => {
      socket.emit('agent_response', response);
    });

    elevenLabsService.on('error', (error: any) => {
      logger.error('ElevenLabs error:', error);
      socket.emit('error', error);
    });

    // Reconnection events
    elevenLabsService.on('reconnecting', (data: any) => {
      socket.emit('reconnecting', data);
    });

    elevenLabsService.on('reconnected', () => {
      socket.emit('reconnected');
    });
  }

  /**
   * Create agent instance based on interpreter ID
   */
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

  /**
   * Handle initialize conversation event
   */
  private async handleInitializeConversation(socket: ConversationSocket, data: any): Promise<void> {
    try {
      const { dreamId, interpreterId } = data;
      
      if (!dreamId || !interpreterId) {
        socket.emit('error', { message: 'dreamId and interpreterId are required' });
        return;
      }

      // Create a new conversation
      const conversation = await conversationService.createConversation({
        userId: socket.userId!,
        dreamId,
        interpreterId
      });

      socket.conversationId = conversation.id;
      
      // Initialize the conversation
      await this.initializeConversation(socket);
      
      // Emit success event
      socket.emit('conversation_initialized', {
        conversationId: conversation.id,
        elevenLabsSessionId: conversation.elevenLabsSessionId || null
      });
      
    } catch (error) {
      logger.error('Failed to handle initialize conversation:', error);
      socket.emit('error', { message: 'Failed to initialize conversation' });
    }
  }

  /**
   * Handle audio chunk from client
   */
  private async handleAudioChunk(socket: ConversationSocket, data: any): Promise<void> {
    try {
      if (!socket.agent) {
        throw new Error('Agent not initialized');
      }

      const elevenLabsService = (socket.agent as any).elevenLabsService;
      if (elevenLabsService?.isActive()) {
        elevenLabsService.sendAudio(data.chunk);
      } else {
        socket.emit('error', { message: 'Audio processing unavailable, please use text input' });
      }
    } catch (error) {
      logger.error('Failed to handle audio chunk:', error);
      socket.emit('error', { message: 'Failed to process audio' });
    }
  }

  /**
   * Handle text input from client
   */
  private async handleTextInput(socket: ConversationSocket, data: any): Promise<void> {
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

  /**
   * Handle conversation end
   */
  private async handleEndConversation(socket: ConversationSocket): Promise<void> {
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

  /**
   * Handle socket disconnect
   */
  private handleDisconnect(socket: ConversationSocket): void {
    logger.info(`User ${socket.userId} disconnected from conversation ${socket.conversationId}`);

    // Clean up agent if needed
    if (socket.conversationId && socket.agent) {
      socket.agent.cleanup().catch(error => {
        logger.error('Failed to cleanup agent:', error);
      });
      this.agents.delete(socket.conversationId);
    }
  }
}