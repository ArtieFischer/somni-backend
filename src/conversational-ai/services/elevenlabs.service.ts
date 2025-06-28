import { WebSocket } from 'ws';
import { EventEmitter } from 'events';
import { 
  ElevenLabsConfig, 
  ElevenLabsWebSocketConfig,
  AudioChunk,
  TranscriptionEvent,
  ElevenLabsError
} from '../types/elevenlabs.types';
import { logger } from '../../utils/logger';

export class ElevenLabsService extends EventEmitter {
  private config: ElevenLabsConfig;
  private ws: WebSocket | null = null;
  private isConnected: boolean = false;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 3;
  private currentConversationId: string | null = null;
  private pingInterval: NodeJS.Timeout | null = null;
  private pingTimeout: NodeJS.Timeout | null = null;
  private keepAliveInterval: NodeJS.Timeout | null = null;
  private lastActivityTime: number = Date.now();
  private pendingInitialization: Record<string, any> | null = null;
  private inactivityCheckInterval: NodeJS.Timeout | null = null;

  constructor(config: ElevenLabsConfig) {
    super();
    this.config = config;
  }

  async connect(conversationId: string, dynamicVariables?: Record<string, any>): Promise<void> {
    try {
      this.currentConversationId = conversationId;
      this.pendingInitialization = dynamicVariables || null;
      
      const wsConfig: ElevenLabsWebSocketConfig = {
        authorization: `Bearer ${this.config.apiKey}`,
        agentId: this.config.agentId,
        conversationId
      };

      // ElevenLabs WebSocket URL with agent_id as query parameter
      const wsUrl = `wss://api.elevenlabs.io/v1/convai/conversation?agent_id=${wsConfig.agentId}`;
      
      // For private agents, we would need a signed URL from the server
      // For MVP, using public agents with direct connection
      // Note: The agent_id refers to a pre-configured agent in ElevenLabs dashboard
      // which already has voice, LLM model, and system prompt configured
      this.ws = new WebSocket(wsUrl);

      this.setupEventHandlers();
      
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Connection timeout'));
        }, 10000);

        this.ws!.once('open', () => {
          clearTimeout(timeout);
          this.isConnected = true;
          this.reconnectAttempts = 0;
          this.emit('connected');
          this.startPingPong();
          this.startKeepAlive();
          this.startInactivityCheck();
          resolve();
        });

        this.ws!.once('error', (error) => {
          clearTimeout(timeout);
          reject(error);
        });
      });
    } catch (error) {
      throw new Error(`Failed to connect to ElevenLabs: ${error}`);
    }
  }

  private setupEventHandlers(): void {
    if (!this.ws) return;

    this.ws.on('message', (data: Buffer) => {
      try {
        const message = JSON.parse(data.toString());
        this.handleMessage(message);
      } catch (error) {
        // Handle binary audio data
        this.handleAudioData(data);
      }
    });

    this.ws.on('error', (error) => {
      console.error('WebSocket error:', error);
      this.emit('error', { code: 'WS_ERROR', message: error.message });
    });

    this.ws.on('close', (code, reason) => {
      this.isConnected = false;
      this.stopKeepAlive();
      this.stopInactivityCheck();
      
      const reasonStr = reason?.toString() || 'Unknown reason';
      const timeSinceLastActivity = Date.now() - this.lastActivityTime;
      
      // Enhanced logging for debugging
      logger.info('ElevenLabs WebSocket close event', {
        code,
        reason: reasonStr,
        conversationId: this.currentConversationId,
        lastActivity: new Date(this.lastActivityTime).toISOString(),
        timeSinceLastActivity: timeSinceLastActivity,
        reasonIncludesInactivity: reasonStr.toLowerCase().includes('inactivity'),
        reasonIncludesTimeout: reasonStr.toLowerCase().includes('timeout')
      });
      
      // More comprehensive inactivity detection
      const isInactivityTimeout = 
        (code === 1000 && (reasonStr.toLowerCase().includes('inactivity') || reasonStr.toLowerCase().includes('timeout'))) || 
        code === 1001 || 
        code === 1006 || // Abnormal closure
        (code === 1000 && timeSinceLastActivity > 55000) || // Normal closure after inactivity
        (reasonStr.toLowerCase().includes('timeout'));
      
      if (isInactivityTimeout) {
        logger.warn('ElevenLabs WebSocket closed due to inactivity/timeout', { 
          code, 
          reason: reasonStr,
          conversationId: this.currentConversationId,
          lastActivity: new Date(this.lastActivityTime).toISOString(),
          timeSinceLastActivity: timeSinceLastActivity
        });
        this.emit('inactivity_timeout', { conversationId: this.currentConversationId });
      } else {
        logger.error('ElevenLabs WebSocket closed (non-timeout)', { 
          code, 
          reason: reasonStr,
          conversationId: this.currentConversationId,
          reconnectAttempts: this.reconnectAttempts
        });
      }
      
      this.emit('disconnected', { code, reason: reasonStr, isInactivityTimeout });
    });
  }

  private handleMessage(message: any): void {
    // Only log non-ping messages at info level
    if (message.type !== 'ping') {
      logger.info('ElevenLabs: Received message', { type: message.type });
    }
    this.lastActivityTime = Date.now();
    
    switch (message.type) {
      case 'conversation_initiation_metadata':
        // Now we can send our initialization message with dynamic variables
        logger.info('ElevenLabs: Received conversation metadata, sending initialization');
        if (this.pendingInitialization) {
          logger.info('ElevenLabs: Sending pending initialization with variables', {
            variableKeys: Object.keys(this.pendingInitialization)
          });
          this.sendConversationInitiation(this.pendingInitialization);
          this.pendingInitialization = null;
        } else {
          logger.warn('ElevenLabs: No pending initialization variables to send');
        }
        this.emit('conversation_initiated', {
          conversationId: message.conversation_initiation_metadata_event.conversation_id,
          audioFormat: message.conversation_initiation_metadata_event.agent_output_audio_format
        });
        break;
      
      case 'user_transcript':
        this.emit('transcription', {
          text: message.user_transcription_event.user_transcript,
          speaker: 'user',
          timestamp: Date.now(),
          isFinal: true
        } as TranscriptionEvent);
        break;
      
      case 'agent_response':
        this.emit('agent_response', {
          text: message.agent_response_event.agent_response,
          isTentative: message.agent_response_event.is_tentative
        });
        break;
      
      case 'agent_response_audio':
        // Audio data will be handled as binary
        break;
      
      case 'vad_score':
        this.emit('vad_score', {
          score: message.vad_score_event.vad_score
        });
        break;
      
      case 'error':
        this.emit('error', {
          code: message.code || 'UNKNOWN_ERROR',
          message: message.message || 'An error occurred',
          details: message.details
        } as ElevenLabsError);
        break;
      
      case 'ping':
        // ElevenLabs sends ping messages to keep connection alive
        // We can respond with pong if needed
        logger.debug('ElevenLabs: Received ping');
        break;
      
      case 'audio':
        // Audio data is sent as a separate message type
        logger.debug('ElevenLabs: Received audio message');
        break;
        
      default:
        console.log('Unknown message type:', message.type);
    }
  }

  private handleAudioData(data: Buffer): void {
    // Emit the raw buffer data for streaming
    this.emit('audio', data);
    
    // Also emit as AudioChunk for backward compatibility
    const audioChunk: AudioChunk = {
      data: data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength),
      timestamp: Date.now(),
      sequence: 0 // TODO: Implement proper sequencing
    };
    this.emit('audio_chunk', audioChunk);
  }

  sendAudio(audioData: ArrayBuffer | string): void {
    if (!this.isConnected || !this.ws) {
      logger.error('Cannot send audio - not connected to ElevenLabs', {
        isConnected: this.isConnected,
        hasWebSocket: !!this.ws,
        conversationId: this.currentConversationId
      });
      throw new Error('Not connected to ElevenLabs');
    }

    // Handle both raw binary and base64 string input
    if (typeof audioData === 'string') {
      // Already base64 encoded from mobile
      logger.debug('Sending base64 audio to ElevenLabs', {
        conversationId: this.currentConversationId,
        base64Length: audioData.length,
        wsReadyState: this.ws.readyState
      });
      this.ws.send(JSON.stringify({
        user_audio_chunk: audioData
      }));
    } else {
      // Convert ArrayBuffer to base64 for ElevenLabs format
      const base64Audio = Buffer.from(audioData).toString('base64');
      logger.debug('Converting and sending ArrayBuffer audio to ElevenLabs', {
        conversationId: this.currentConversationId,
        originalSize: audioData.byteLength,
        base64Length: base64Audio.length,
        wsReadyState: this.ws.readyState
      });
      this.ws.send(JSON.stringify({
        user_audio_chunk: base64Audio
      }));
    }
    
    this.lastActivityTime = Date.now();
  }

  sendConversationConfig(config: any): void {
    if (!this.isConnected || !this.ws) {
      throw new Error('Not connected to ElevenLabs');
    }

    this.ws.send(JSON.stringify({
      type: 'conversation_initiation_client_data',
      conversation_config_override: config
    }));
  }

  /**
   * Send initial conversation configuration with dynamic variables
   */
  sendConversationInitiation(dynamicVariables?: Record<string, any>): void {
    if (!this.isConnected || !this.ws) {
      throw new Error('Not connected to ElevenLabs');
    }

    // According to ElevenLabs docs, dynamic_variables go at the root level
    const initMessage: any = {
      type: 'conversation_initiation_client_data',
      dynamic_variables: dynamicVariables || {}
    };
    
    // If this is a resumed conversation, override the first message
    if (dynamicVariables?.is_resumed_conversation === 'true') {
      initMessage.conversation_config_override = {
        agent: {
          first_message: `Welcome back ${dynamicVariables.user_name}, how else can I help you explore your dream?`
        }
      };
    }

    // Log key values for debugging
    const debugVars = dynamicVariables ? {
      user_name: dynamicVariables.user_name,
      dream_topic: dynamicVariables.dream_topic,
      age: dynamicVariables.age,
      emotionalToneprimary: dynamicVariables.emotionalToneprimary,
      hasContent: !!dynamicVariables.dreamContent,
      contentLength: dynamicVariables.dreamContent?.length || 0,
      hasFirstMessage: !!dynamicVariables.first_message,
      firstMessagePreview: dynamicVariables.first_message?.substring(0, 50)
    } : {};
    
    logger.info('Sending conversation initiation to ElevenLabs', {
      hasVariables: !!dynamicVariables,
      variableKeys: dynamicVariables ? Object.keys(dynamicVariables) : [],
      debugValues: debugVars,
      hasConfigOverride: !!initMessage.conversation_config_override,
      isResumed: dynamicVariables?.is_resumed_conversation,
      fullMessage: JSON.stringify(initMessage)
    });

    this.ws.send(JSON.stringify(initMessage));
    
    // Send user_activity to trigger the agent's first message
    setTimeout(() => {
      if (this.isConnected && this.ws) {
        logger.info('Sending user_activity to trigger agent first message');
        this.ws.send(JSON.stringify({
          type: 'user_activity'
        }));
      }
    }, 500);
  }

  sendToolResponse(toolCallId: string, result: any): void {
    if (!this.isConnected || !this.ws) {
      throw new Error('Not connected to ElevenLabs');
    }

    this.ws.send(JSON.stringify({
      type: 'client_tool_result',
      client_tool_result: {
        tool_call_id: toolCallId,
        result: JSON.stringify(result),
        is_error: false
      }
    }));
  }

  /**
   * Send user text message to ElevenLabs
   */
  sendUserText(text: string): void {
    if (!this.isConnected || !this.ws) {
      throw new Error('Not connected to ElevenLabs');
    }

    logger.info('ElevenLabs: Sending user text message', { text });
    
    this.ws.send(JSON.stringify({
      type: 'user_message',
      text: text
    }));
    
    this.lastActivityTime = Date.now();
  }

  /**
   * Send session termination signal (e.g., when user stops recording)
   */
  sendSessionTermination(): void {
    if (!this.isConnected || !this.ws) {
      return; // Silently ignore if not connected
    }

    logger.info('ElevenLabs: Sending session termination signal');
    
    this.ws.send(JSON.stringify({
      terminate_session: true
    }));
  }

  async disconnect(): Promise<void> {
    this.stopPingPong();
    this.stopKeepAlive();
    this.stopInactivityCheck();
    this.currentConversationId = null;
    
    if (this.ws) {
      this.ws.close();
      this.ws = null;
      this.isConnected = false;
    }
  }

  /**
   * Start ping/pong to keep connection alive
   */
  private startPingPong(): void {
    this.pingInterval = setInterval(() => {
      if (this.ws && this.isConnected) {
        this.ws.ping();
        
        // Set timeout for pong response
        this.pingTimeout = setTimeout(() => {
          logger.error('Ping timeout - no pong received');
          this.ws?.terminate();
        }, 5000);
      }
    }, 30000); // Ping every 30 seconds

    // Handle pong
    if (this.ws) {
      this.ws.on('pong', () => {
        if (this.pingTimeout) {
          clearTimeout(this.pingTimeout);
          this.pingTimeout = null;
        }
      });
    }
  }

  /**
   * Stop ping/pong mechanism
   */
  private stopPingPong(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
    
    if (this.pingTimeout) {
      clearTimeout(this.pingTimeout);
      this.pingTimeout = null;
    }
  }

  /**
   * Start keep-alive mechanism to prevent inactivity timeout
   */
  private startKeepAlive(): void {
    // Send a keep-alive message more frequently to prevent timeout
    this.keepAliveInterval = setInterval(() => {
      const timeSinceLastActivity = Date.now() - this.lastActivityTime;
      
      // Send keep-alive if no activity for 30 seconds (well before the 60-second timeout)
      if (this.ws && this.isConnected && timeSinceLastActivity > 30000) {
        logger.info('Sending keep-alive user_activity message', {
          timeSinceLastActivity,
          conversationId: this.currentConversationId,
          wsReadyState: this.ws.readyState
        });
        
        try {
          // Send user_activity to keep connection alive
          this.ws.send(JSON.stringify({
            type: 'user_activity'
          }));
          
          this.lastActivityTime = Date.now();
          logger.debug('Keep-alive sent successfully');
        } catch (error) {
          logger.error('Failed to send keep-alive', {
            error: error instanceof Error ? error.message : 'Unknown error',
            wsReadyState: this.ws?.readyState
          });
        }
      }
    }, 15000); // Check every 15 seconds (more frequent than before)
  }

  /**
   * Stop keep-alive mechanism
   */
  private stopKeepAlive(): void {
    if (this.keepAliveInterval) {
      clearInterval(this.keepAliveInterval);
      this.keepAliveInterval = null;
    }
  }

  /**
   * Start proactive inactivity check
   */
  private startInactivityCheck(): void {
    // Check for inactivity every 10 seconds
    this.inactivityCheckInterval = setInterval(() => {
      const timeSinceLastActivity = Date.now() - this.lastActivityTime;
      
      // If no activity for 65 seconds (5 seconds after ElevenLabs timeout)
      if (timeSinceLastActivity > 65000) {
        logger.warn('Proactive inactivity timeout detected', {
          timeSinceLastActivity,
          conversationId: this.currentConversationId,
          wsReadyState: this.ws?.readyState,
          isConnected: this.isConnected
        });
        
        // Emit timeout event
        this.emit('inactivity_timeout', { 
          conversationId: this.currentConversationId,
          timeSinceLastActivity,
          proactiveDetection: true 
        });
        
        // Force close the connection if still open
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
          logger.info('Force closing connection due to inactivity');
          this.ws.close(1000, 'Inactivity timeout');
        }
        
        // Stop checking
        this.stopInactivityCheck();
      }
    }, 10000); // Check every 10 seconds
  }

  /**
   * Stop inactivity check
   */
  private stopInactivityCheck(): void {
    if (this.inactivityCheckInterval) {
      clearInterval(this.inactivityCheckInterval);
      this.inactivityCheckInterval = null;
    }
  }

  private async reconnect(): Promise<void> {
    try {
      // Only attempt reconnection if we had a conversation
      const conversationId = this.currentConversationId;
      if (!conversationId) {
        // No conversation to reconnect to, just stop
        this.reconnectAttempts = 0;
        return;
      }
      
      console.log(`Reconnection attempt ${this.reconnectAttempts}`);
      this.emit('reconnecting', { attempt: this.reconnectAttempts });
      
      // Attempt to reconnect
      await this.connect(conversationId);
      console.log('Reconnection successful');
      this.emit('reconnected');
    } catch (error) {
      console.error('Reconnection failed:', error);
      this.emit('reconnection_failed', { 
        attempt: this.reconnectAttempts,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      // Schedule next reconnection attempt if within limits
      if (this.reconnectAttempts < this.maxReconnectAttempts) {
        this.reconnectAttempts++;
        const backoffDelay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
        setTimeout(() => this.reconnect(), backoffDelay);
      } else {
        this.emit('max_reconnection_attempts_reached');
      }
    }
  }

  isActive(): boolean {
    return this.isConnected;
  }
}

// Factory function for creating ElevenLabs service instances
export function createElevenLabsService(agentId: string): ElevenLabsService {
  const config: ElevenLabsConfig = {
    apiKey: process.env.ELEVENLABS_API_KEY || '',
    agentId: agentId
  };

  return new ElevenLabsService(config);
}