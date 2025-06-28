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
  hasTimedOut?: boolean;
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
    
    // Clear any previous timeout state
    socket.hasTimedOut = false;
    
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

    // Send conversation started event without a message to let ElevenLabs handle the first message
    socket.emit('conversation_started', {
      interpreter: conversation.interpreterId,
      mode: socket.agent['elevenLabsService'] ? 'voice' : 'text',
      elevenLabsSessionId: conversation.elevenLabsSessionId
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
      logger.info('Received audio_chunk event', { userId: socket.userId });
      await this.handleAudioChunk(socket, data);
    });

    // User audio streaming (from mobile guide)
    socket.on('user-audio', async (data) => {
      logger.info('Received user-audio event', { userId: socket.userId });
      await this.handleAudioChunk(socket, data);
    });

    // User audio end signal (from mobile guide)
    socket.on('user-audio-end', async () => {
      logger.info('Received user-audio-end event', { userId: socket.userId });
      await this.handleUserAudioEnd(socket);
    });

    // Text input (fallback)
    socket.on('text_input', async (data) => {
      logger.info('Received text_input event', { userId: socket.userId, text: data.text });
      await this.handleTextInput(socket, data);
    });

    // Send audio (alternative event name)
    socket.on('send_audio', async (data) => {
      logger.info('Received send_audio event', { userId: socket.userId });
      await this.handleAudioChunk(socket, data);
    });

    // Send text (alternative event name)
    socket.on('send_text', async (data) => {
      logger.info('Received send_text event', { userId: socket.userId, text: data.text });
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

    // Debug: Log all incoming events
    socket.onAny((eventName: string, ...args: any[]) => {
      logger.info('Socket event received', {
        event: eventName,
        userId: socket.userId,
        conversationId: socket.conversationId,
        hasData: args.length > 0,
        dataPreview: args[0] ? JSON.stringify(args[0]).substring(0, 100) : null
      });
    });
  }

  /**
   * Setup ElevenLabs event forwarding
   */
  private setupElevenLabsForwarding(socket: ConversationSocket, elevenLabsService: any): void {
    elevenLabsService.on('audio', (chunk: any) => {
      // Convert Buffer to ArrayBuffer for frontend
      const audioData = chunk instanceof Buffer ? chunk : chunk.data;
      const arrayBuffer = audioData instanceof Buffer 
        ? audioData.buffer.slice(audioData.byteOffset, audioData.byteOffset + audioData.byteLength)
        : audioData;
      
      // Emit in the format expected by frontend
      socket.emit('audio_chunk', {
        chunk: arrayBuffer,
        isLast: false // ElevenLabs doesn't signal last chunk, handled by session end
      });
    });

    elevenLabsService.on('transcription', (event: any) => {
      // Log transcription for debugging
      logger.info('Transcription event', {
        conversationId: socket.conversationId,
        speaker: event.speaker,
        text: event.text,
        textLength: event.text?.length || 0,
        isFinal: event.isFinal,
        isEmpty: !event.text || event.text.trim().length === 0
      });
      
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
      // Save agent response to database
      if (response.text && !response.isTentative) {
        conversationService.saveMessage({
          conversationId: socket.conversationId!,
          role: 'assistant',
          content: response.text
        }).catch(err => logger.error('Failed to save agent response:', err));
      }
    });

    elevenLabsService.on('conversation_initiated', async (data: any) => {
      // Update the ElevenLabs session ID in the database
      if (data.conversationId && socket.conversationId) {
        await conversationService.updateElevenLabsSessionId(
          socket.conversationId, 
          data.conversationId
        );
      }
      // Forward to client with expected format
      socket.emit('elevenlabs_conversation_initiated', {
        audioFormat: data.audioFormat || 'pcm_16000',
        conversationId: data.conversationId
      });
    });

    elevenLabsService.on('error', (error: any) => {
      logger.error('ElevenLabs error:', error);
      socket.emit('error', error);
    });

    elevenLabsService.on('disconnected', (data: any) => {
      logger.info('ElevenLabs disconnected event', {
        ...data,
        socketId: socket.id,
        userId: socket.userId
      });
      
      // Mark socket as timed out if this was an inactivity timeout
      if (data.isInactivityTimeout) {
        socket.hasTimedOut = true;
      }
      
      // Forward disconnection event to client
      socket.emit('elevenlabs_disconnected', {
        reason: data.reason || 'disconnected',
        timeout: data.isInactivityTimeout ? 60000 : undefined
      });
    });

    elevenLabsService.on('inactivity_timeout', (data: any) => {
      logger.warn('ElevenLabs inactivity timeout detected', {
        ...data,
        socketId: socket.id,
        userId: socket.userId
      });
      
      // Mark socket as timed out to prevent fallback
      socket.hasTimedOut = true;
      
      // Emit the timeout event to the client
      socket.emit('inactivity_timeout', {
        message: 'Connection timed out due to inactivity. Please reconnect to continue.',
        conversationId: data.conversationId,
        detectedBy: data.detectedBy || 'websocket_close',
        timestamp: new Date().toISOString(),
        requiresReconnect: true
      });
      
      // Also emit a more general disconnection event
      socket.emit('elevenlabs_disconnected', {
        reason: 'inactivity_timeout',
        timeout: 60000
      });
    });

    // Reconnection events - commented out to prevent loops
    // elevenLabsService.on('reconnecting', (data: any) => {
    //   socket.emit('reconnecting', data);
    // });

    // elevenLabsService.on('reconnected', () => {
    //   socket.emit('reconnected');
    // });
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

      // Find or create a conversation for this dream/interpreter combination
      const conversation = await conversationService.findOrCreateConversation({
        userId: socket.userId!,
        dreamId,
        interpreterId
      });

      socket.conversationId = conversation.id;
      
      // Initialize the conversation
      await this.initializeConversation(socket);
      
      // Get message count to indicate if this is a resumed conversation
      const messages = await conversationService.getConversationMessages(conversation.id);
      
      logger.info('Conversation initialization complete', {
        conversationId: conversation.id,
        messageCount: messages.length,
        isResumed: messages.length > 0
      });
      
      // Emit success event
      socket.emit('conversation_initialized', {
        conversationId: conversation.id,
        elevenLabsSessionId: conversation.elevenLabsSessionId || null,
        isResumed: messages.length > 0,
        messageCount: messages.length
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
      // Log incoming audio chunk details
      logger.info('Received audio chunk from client', {
        conversationId: socket.conversationId,
        userId: socket.userId,
        hasAudio: !!data.audio,
        hasChunk: !!data.chunk,
        audioLength: data.audio?.length || data.chunk?.length || 0,
        dataType: typeof (data.audio || data.chunk),
        socketId: socket.id
      });

      if (!socket.agent) {
        logger.warn('Audio chunk received but agent not initialized', {
          conversationId: socket.conversationId,
          userId: socket.userId
        });
        throw new Error('Agent not initialized');
      }

      // Check if connection has timed out
      if (socket.hasTimedOut) {
        logger.warn('Audio chunk received after timeout', {
          conversationId: socket.conversationId,
          userId: socket.userId
        });
        socket.emit('error', { 
          message: 'Connection has timed out. Please reconnect to continue.',
          code: 'CONNECTION_TIMEOUT',
          requiresReconnect: true
        });
        return;
      }

      const elevenLabsService = (socket.agent as any).elevenLabsService;
      if (elevenLabsService?.isActive()) {
        logger.debug('Forwarding audio to ElevenLabs', {
          conversationId: socket.conversationId,
          audioSize: data.audio?.length || data.chunk?.length || 0
        });
        elevenLabsService.sendAudio(data.audio || data.chunk);
      } else {
        logger.error('ElevenLabs service not active', {
          conversationId: socket.conversationId,
          userId: socket.userId,
          hasService: !!elevenLabsService
        });
        socket.emit('error', { 
          message: 'Voice service not available. Please reconnect.',
          code: 'SERVICE_UNAVAILABLE',
          requiresReconnect: true
        });
      }
    } catch (error) {
      logger.error('Failed to handle audio chunk:', error);
      socket.emit('error', { message: 'Failed to process audio' });
    }
  }

  /**
   * Handle user audio end signal (when user stops recording)
   */
  private async handleUserAudioEnd(socket: ConversationSocket): Promise<void> {
    try {
      if (!socket.agent) {
        return; // Silently ignore if agent not initialized
      }

      const elevenLabsService = (socket.agent as any).elevenLabsService;
      if (elevenLabsService?.isActive()) {
        elevenLabsService.sendSessionTermination();
      }
    } catch (error) {
      logger.error('Failed to handle user audio end:', error);
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

      // Check if connection has timed out
      if (socket.hasTimedOut) {
        socket.emit('error', { 
          message: 'Connection has timed out. Please reconnect to continue.',
          code: 'CONNECTION_TIMEOUT',
          requiresReconnect: true
        });
        return;
      }

      const { text } = data;
      const elevenLabsService = (socket.agent as any).elevenLabsService;
      
      // If ElevenLabs is active, send text through WebSocket
      if (elevenLabsService?.isActive()) {
        logger.info('Forwarding text to ElevenLabs', { text });
        elevenLabsService.sendUserText(text);
        // The response will come through the existing event handlers
        // (transcription events, audio_chunk events, etc.)
        return;
      }
      
      // Prevent fallback if this is due to timeout
      if (!elevenLabsService) {
        socket.emit('error', { 
          message: 'Voice service not available. Please reconnect.',
          code: 'SERVICE_UNAVAILABLE',
          requiresReconnect: true
        });
        return;
      }
      
      // Fallback: Only use OpenRouter if ElevenLabs is not available (but not due to timeout)
      logger.warn('ElevenLabs not available, falling back to OpenRouter');
      
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