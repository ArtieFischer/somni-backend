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
  private pendingInitialization: Record<string, any> | null = null;

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
      logger.error('ElevenLabs WebSocket closed', { 
        code, 
        reason: reason?.toString() || 'Unknown reason',
        conversationId: this.currentConversationId,
        reconnectAttempts: this.reconnectAttempts
      });
      this.emit('disconnected', { code, reason: reason?.toString() });
      
      // Disable automatic reconnection for now to debug the issue
      // if (this.reconnectAttempts < this.maxReconnectAttempts) {
      //   this.reconnectAttempts++;
      //   setTimeout(() => this.reconnect(), 1000 * this.reconnectAttempts);
      // }
    });
  }

  private handleMessage(message: any): void {
    logger.info('ElevenLabs: Received message', { type: message.type });
    
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
      
      default:
        console.log('Unknown message type:', message.type);
    }
  }

  private handleAudioData(data: Buffer): void {
    const audioChunk: AudioChunk = {
      data: data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength),
      timestamp: Date.now(),
      sequence: 0 // TODO: Implement proper sequencing
    };
    
    this.emit('audio', audioChunk);
  }

  sendAudio(audioData: ArrayBuffer): void {
    if (!this.isConnected || !this.ws) {
      throw new Error('Not connected to ElevenLabs');
    }

    // Convert to base64 for ElevenLabs format
    const base64Audio = Buffer.from(audioData).toString('base64');
    
    this.ws.send(JSON.stringify({
      user_audio_chunk: base64Audio
    }));
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
    const initMessage = {
      type: 'conversation_initiation_client_data',
      dynamic_variables: dynamicVariables || {}
    };

    logger.info('Sending conversation initiation to ElevenLabs', {
      hasVariables: !!dynamicVariables,
      variableKeys: dynamicVariables ? Object.keys(dynamicVariables) : []
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
  }

  async disconnect(): Promise<void> {
    this.stopPingPong();
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