import { WebSocket } from 'ws';
import { EventEmitter } from 'events';
import { 
  ElevenLabsConfig, 
  ElevenLabsWebSocketConfig,
  AudioChunk,
  TranscriptionEvent,
  ElevenLabsError
} from '../types/elevenlabs.types';

export class ElevenLabsService extends EventEmitter {
  private config: ElevenLabsConfig;
  private ws: WebSocket | null = null;
  private isConnected: boolean = false;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 3;

  constructor(config: ElevenLabsConfig) {
    super();
    this.config = config;
  }

  async connect(conversationId: string): Promise<void> {
    try {
      const wsConfig: ElevenLabsWebSocketConfig = {
        authorization: `Bearer ${this.config.apiKey}`,
        agentId: this.config.agentId,
        conversationId
      };

      // ElevenLabs WebSocket URL with agent_id as query parameter
      const wsUrl = `wss://api.elevenlabs.io/v1/convai/conversation?agent_id=${wsConfig.agentId}`;
      
      // For private agents, we would need a signed URL from the server
      // For MVP, using public agents with direct connection
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
      this.emit('disconnected', { code, reason: reason.toString() });
      
      // Basic reconnection logic for MVP
      if (this.reconnectAttempts < this.maxReconnectAttempts) {
        this.reconnectAttempts++;
        setTimeout(() => this.reconnect(), 1000 * this.reconnectAttempts);
      }
    });
  }

  private handleMessage(message: any): void {
    switch (message.type) {
      case 'conversation_initiation_metadata':
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

  async disconnect(): Promise<void> {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
      this.isConnected = false;
    }
  }

  private async reconnect(): Promise<void> {
    try {
      console.log(`Reconnection attempt ${this.reconnectAttempts}`);
      // TODO: Implement proper reconnection with conversation ID
      this.emit('reconnecting', { attempt: this.reconnectAttempts });
    } catch (error) {
      console.error('Reconnection failed:', error);
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