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
import { createTranscriptPoller, TranscriptPollerService } from './transcript-poller.service';

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
  private transcriptionTimeout: NodeJS.Timeout | null = null;
  private lastAudioSentTime: number = 0;
  private audioChunkCount: number = 0;
  private totalAudioBytesSent: number = 0;
  private transcriptPoller: TranscriptPollerService | null = null;
  private elevenLabsConversationId: string | null = null;
  private pollingFallbackTimer: NodeJS.Timeout | null = null;
  private hasReceivedTranscript: boolean = false;

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
          
          // Send a test ping immediately to verify connection
          setTimeout(() => {
            if (this.ws && this.isConnected) {
              logger.debug('Sending initial test ping');
              this.ws.ping();
            }
          }, 1000);
          
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
      logger.error('ElevenLabs WebSocket error:', {
        error: error.message,
        code: (error as any).code,
        conversationId: this.currentConversationId
      });
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
    // Log ALL messages for debugging
    logger.info('ElevenLabs: Received message', { 
      type: message.type,
      hasUserTranscript: !!message.user_transcription_event,
      hasAgentResponse: !!message.agent_response_event,
      messageKeys: Object.keys(message),
      eventKeys: message.user_transcription_event ? Object.keys(message.user_transcription_event) : []
    });
    
    this.lastActivityTime = Date.now();
    
    switch (message.type) {
      case 'conversation_initiation_metadata':
        // Log the client_events we're configured to receive
        const clientEvents = message.conversation_initiation_metadata_event?.client_events || [];
        this.elevenLabsConversationId = message.conversation_initiation_metadata_event?.conversation_id;
        
        logger.info('ElevenLabs: Received conversation metadata', {
          conversationId: this.elevenLabsConversationId,
          clientEvents: clientEvents,
          hasUserTranscript: clientEvents.includes('user_transcript'),
          hasAgentResponse: clientEvents.includes('agent_response'),
          fullEvent: JSON.stringify(message.conversation_initiation_metadata_event)
        });
        
        // Since agent dashboard shows events are configured, let's just start the conversation
        // and monitor what we actually receive
        logger.info('ElevenLabs conversation metadata received', {
          conversationId: this.elevenLabsConversationId,
          clientEvents,
          agentOutputFormat: message.conversation_initiation_metadata_event?.agent_output_audio_format,
          userInputFormat: message.conversation_initiation_metadata_event?.user_input_audio_format
        });
        
        // Always schedule polling as backup since dashboard config seems correct
        this.schedulePollingFallback();
        
        // Now we can send our initialization message with dynamic variables
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
        logger.info('ElevenLabs: User transcript received', {
          text: message.user_transcription_event.user_transcript,
          length: message.user_transcription_event.user_transcript?.length || 0,
          isEmpty: !message.user_transcription_event.user_transcript || message.user_transcription_event.user_transcript.trim() === ''
        });
        
        // Mark that we're receiving transcripts
        this.hasReceivedTranscript = true;
        
        // Cancel polling fallback if scheduled
        if (this.pollingFallbackTimer) {
          clearTimeout(this.pollingFallbackTimer);
          this.pollingFallbackTimer = null;
          logger.info('Cancelled polling fallback - receiving transcripts via WebSocket');
        }
        
        // Clear transcription timeout
        if (this.transcriptionTimeout) {
          clearTimeout(this.transcriptionTimeout);
          this.transcriptionTimeout = null;
        }
        
        // Reset audio stats after successful transcription
        this.audioChunkCount = 0;
        this.totalAudioBytesSent = 0;
        
        // Only emit non-empty transcriptions
        if (message.user_transcription_event.user_transcript && message.user_transcription_event.user_transcript.trim()) {
          this.emit('transcription', {
            text: message.user_transcription_event.user_transcript,
            speaker: 'user',
            timestamp: Date.now(),
            isFinal: true
          } as TranscriptionEvent);
        } else {
          logger.warn('ElevenLabs: Received empty user transcript');
        }
        break;
      
      case 'agent_response':
        logger.info('ElevenLabs: Agent response', {
          text: message.agent_response_event.agent_response,
          isTentative: message.agent_response_event.is_tentative,
          length: message.agent_response_event.agent_response?.length || 0
        });
        this.emit('agent_response', {
          text: message.agent_response_event.agent_response,
          isTentative: message.agent_response_event.is_tentative
        });
        break;
      
      case 'agent_response_audio':
        // Audio data will be handled as binary
        break;
      
      case 'user_transcript_interim':
        // Handle interim transcripts (non-final)
        logger.info('ElevenLabs: Interim user transcript', {
          text: message.user_transcription_event?.user_transcript || '',
          length: message.user_transcription_event?.user_transcript?.length || 0
        });
        break;
      
      case 'user_transcription':
        // Alternative event name for transcriptions
        logger.info('ElevenLabs: User transcription (alt)', {
          hasTranscript: !!message.user_transcript,
          transcript: message.user_transcript,
          length: message.user_transcript?.length || 0
        });
        
        if (message.user_transcript && message.user_transcript.trim()) {
          this.emit('transcription', {
            text: message.user_transcript,
            speaker: 'user',
            timestamp: Date.now(),
            isFinal: true
          } as TranscriptionEvent);
        }
        break;
      
      case 'vad_score':
        this.emit('vad_score', {
          score: message.vad_score_event.vad_score
        });
        break;
      
      case 'error':
        logger.error('ElevenLabs error message received', {
          code: message.code,
          message: message.message,
          details: message.details
        });
        this.emit('error', {
          code: message.code || 'UNKNOWN_ERROR',
          message: message.message || 'An error occurred',
          details: message.details
        } as ElevenLabsError);
        break;
      
      case 'ping':
        // ElevenLabs sends ping messages to keep connection alive
        logger.debug('ElevenLabs: Received ping', {
          hasEventId: !!message.event_id,
          eventId: message.event_id
        });
        // Don't send pong - ElevenLabs doesn't expect a response
        break;
      
      case 'audio':
        // Audio data is sent as a separate message type
        logger.debug('ElevenLabs: Received audio message', {
          hasAudioEvent: !!message.audio_event,
          audioEventKeys: message.audio_event ? Object.keys(message.audio_event) : [],
          messageStructure: JSON.stringify(message).substring(0, 200)
        });
        break;
        
      default:
        logger.warn('Unknown ElevenLabs message type:', { 
          type: message.type,
          hasData: !!message,
          messageKeys: Object.keys(message),
          messagePreview: JSON.stringify(message).substring(0, 500),
          possibleTranscript: message.user_transcript || message.transcript || null,
          allEventKeys: Object.keys(message).filter(k => k.includes('event')),
          allTranscriptKeys: Object.keys(message).filter(k => k.includes('transcript'))
        });
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

  sendAudio(audioData: ArrayBuffer | string | Buffer): void {
    if (!this.isConnected || !this.ws) {
      logger.error('Cannot send audio - not connected to ElevenLabs', {
        isConnected: this.isConnected,
        hasWebSocket: !!this.ws,
        conversationId: this.currentConversationId
      });
      throw new Error('Not connected to ElevenLabs');
    }

    let audioToSend: string;
    let audioSizeBytes: number = 0;
    
    // Handle different input formats
    if (typeof audioData === 'string') {
      // Already base64 encoded from mobile
      audioToSend = audioData;
      // Estimate original size (base64 is ~33% larger)
      audioSizeBytes = Math.floor(audioData.length * 0.75);
      logger.debug('Sending base64 audio to ElevenLabs', {
        conversationId: this.currentConversationId,
        base64Length: audioData.length,
        estimatedBytes: audioSizeBytes,
        wsReadyState: this.ws.readyState
      });
    } else if (Buffer.isBuffer(audioData)) {
      // Direct buffer - convert to base64
      audioSizeBytes = audioData.length;
      audioToSend = audioData.toString('base64');
      logger.debug('Converting Buffer to base64 for ElevenLabs', {
        conversationId: this.currentConversationId,
        bufferSize: audioData.length,
        base64Length: audioToSend.length,
        wsReadyState: this.ws.readyState
      });
    } else {
      // ArrayBuffer - convert to base64
      audioSizeBytes = audioData.byteLength;
      audioToSend = Buffer.from(audioData).toString('base64');
      logger.debug('Converting ArrayBuffer to base64 for ElevenLabs', {
        conversationId: this.currentConversationId,
        originalSize: audioData.byteLength,
        base64Length: audioToSend.length,
        wsReadyState: this.ws.readyState
      });
    }
    
    // Track audio statistics
    this.audioChunkCount++;
    this.totalAudioBytesSent += audioSizeBytes;
    
    // Log if we're sending a lot of data
    if (this.audioChunkCount % 10 === 0) {
      logger.info('Audio streaming statistics', {
        conversationId: this.currentConversationId,
        chunkssSent: this.audioChunkCount,
        totalBytesSent: this.totalAudioBytesSent,
        totalDurationEstimate: Math.floor(this.totalAudioBytesSent / 32000) + 's' // 16kHz * 2 bytes
      });
    }
    
    // Send audio in the format ElevenLabs expects
    this.ws.send(JSON.stringify({
      user_audio_chunk: audioToSend
    }));
    
    this.lastActivityTime = Date.now();
    this.lastAudioSentTime = Date.now();
    
    // Clear any existing transcription timeout
    if (this.transcriptionTimeout) {
      clearTimeout(this.transcriptionTimeout);
    }
    
    // Set a timeout for transcription response
    this.transcriptionTimeout = setTimeout(() => {
      logger.warn('ElevenLabs: No transcription received within timeout', {
        conversationId: this.currentConversationId,
        timeSinceLastAudio: Date.now() - this.lastAudioSentTime,
        totalAudioSent: this.totalAudioBytesSent,
        chunkCount: this.audioChunkCount
      });
      
      // Update activity time to prevent disconnection during long audio
      this.lastActivityTime = Date.now();
      
      // Send a ping to keep connection alive
      if (this.ws && this.isConnected) {
        try {
          this.ws.ping();
          logger.debug('Sent ping after transcription timeout');
        } catch (error) {
          logger.error('Failed to send ping after timeout', error);
        }
      }
      
      // Emit timeout event for frontend awareness
      this.emit('transcription_timeout', {
        conversationId: this.currentConversationId,
        timeSinceLastAudio: Date.now() - this.lastAudioSentTime
      });
    }, 20000); // 20 second timeout (increased from 15)
  }

  sendConversationConfig(config: Record<string, unknown>): void {
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
  sendConversationInitiation(dynamicVariables?: Record<string, unknown>): void {
    if (!this.isConnected || !this.ws) {
      throw new Error('Not connected to ElevenLabs');
    }

    // According to ElevenLabs docs, try the exact format from their documentation
    const initMessage = {
      type: 'conversation_initiation_client_data',
      dynamic_variables: dynamicVariables || {},
      conversation_config_override: {
        agent: {} as { first_message: string }
      }
    };
    
    logger.info('ElevenLabs initiation message structure', {
      hasConversationConfig: !!initMessage.conversation_config_override,
      messageType: initMessage.type,
      hasDynamicVars: !!dynamicVariables
    });
    
    // Set the agent's first message based on conversation type
    if (dynamicVariables?.is_resumed_conversation === 'true') {
      // Resumed conversation
      initMessage.conversation_config_override.agent = {
        first_message: `Welcome back ${dynamicVariables.user_name}, how else can I help you explore your dream?`
      };
    } else {
      // New conversation - agent introduces themselves
      initMessage.conversation_config_override.agent = {
        first_message: `Hello ${dynamicVariables?.user_name || 'Dreamer'}, I'm here to help you explore your dream. Tell me about it, and we can delve into its meanings together.`
      };
    }

    // Log key values for debugging
    const debugVars = dynamicVariables ? {
      user_name: dynamicVariables.user_name,
      dream_topic: dynamicVariables.dream_topic,
      age: dynamicVariables.age,
      emotionalToneprimary: dynamicVariables.emotionalToneprimary,
      hasContent: !!dynamicVariables.dreamContent,
      contentLength: typeof dynamicVariables.dreamContent === 'string' ? dynamicVariables.dreamContent.length : 0,
      hasFirstMessage: !!dynamicVariables.first_message,
      firstMessagePreview: typeof dynamicVariables.first_message === 'string' ? dynamicVariables.first_message.substring(0, 50) : undefined
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
    
    // Agent should now speak first automatically based on the first_message configuration
    logger.info('Agent first_message configured - agent should speak automatically', {
      isResumed: dynamicVariables?.is_resumed_conversation === 'true'
    });
  }

  sendToolResponse(toolCallId: string, result: unknown): void {
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
   * Send user activity signal to keep session active
   */
  sendUserActivity(): void {
    if (!this.isConnected || !this.ws) {
      return;
    }
    
    logger.debug('ElevenLabs: Sending ping to keep connection alive');
    
    // Use ping frame instead of user_activity message
    try {
      this.ws.ping();
      this.lastActivityTime = Date.now();
    } catch (error) {
      logger.error('Failed to send ping', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Send user message begin signal (optional for PTT)
   */
  sendUserMessageBegin(): void {
    if (!this.isConnected || !this.ws) {
      return;
    }
    
    logger.debug('ElevenLabs: Sending user_message_begin signal');
    
    // Clear any existing transcription timeout from previous message
    if (this.transcriptionTimeout) {
      clearTimeout(this.transcriptionTimeout);
      this.transcriptionTimeout = null;
      logger.debug('ElevenLabs: Cleared previous transcription timeout on new message begin');
    }
    
    this.ws.send(JSON.stringify({
      type: 'user_message_begin'
    }));
    
    // Reset audio tracking for new message
    this.audioChunkCount = 0;
    this.totalAudioBytesSent = 0;
    
    this.lastActivityTime = Date.now();
  }

  /**
   * Send session termination signal (e.g., when user stops recording)
   */
  sendSessionTermination(): void {
    if (!this.isConnected || !this.ws) {
      return; // Silently ignore if not connected
    }

    logger.info('ElevenLabs: Session termination - sending end_user_audio for PTT', {
      audioChunksSent: this.audioChunkCount,
      totalBytesSent: this.totalAudioBytesSent
    });
    
    // Clear transcription timeout since we're ending the session
    if (this.transcriptionTimeout) {
      clearTimeout(this.transcriptionTimeout);
      this.transcriptionTimeout = null;
      logger.debug('ElevenLabs: Cleared transcription timeout on session termination');
    }
    
    try {
      // For push-to-talk, send the proper boundary frame
      this.ws.send(JSON.stringify({
        type: 'end_user_audio'
      }));
      
      logger.info('ElevenLabs: Sent end_user_audio boundary frame');
    } catch (error) {
      logger.error('Failed to send end_user_audio signal', error);
    }
    
    this.lastActivityTime = Date.now();
  }

  async disconnect(): Promise<void> {
    this.stopPingPong();
    this.stopKeepAlive();
    this.stopInactivityCheck();
    this.stopTranscriptPolling();
    this.currentConversationId = null;
    this.elevenLabsConversationId = null;
    this.hasReceivedTranscript = false;
    
    // Clear transcription timeout
    if (this.transcriptionTimeout) {
      clearTimeout(this.transcriptionTimeout);
      this.transcriptionTimeout = null;
    }
    
    // Clear polling fallback timer
    if (this.pollingFallbackTimer) {
      clearTimeout(this.pollingFallbackTimer);
      this.pollingFallbackTimer = null;
    }
    
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
      
      // Send keep-alive if no activity for 20 seconds (well before the 60-second timeout)
      if (this.ws && this.isConnected && timeSinceLastActivity > 20000) {
        logger.info('Sending keep-alive ping', {
          timeSinceLastActivity,
          conversationId: this.currentConversationId,
          wsReadyState: this.ws.readyState
        });
        
        try {
          // Send a ping frame instead of user_activity
          this.ws.ping();
          
          this.lastActivityTime = Date.now();
          logger.debug('Keep-alive ping sent successfully');
        } catch (error) {
          logger.error('Failed to send keep-alive', {
            error: error instanceof Error ? error.message : 'Unknown error',
            wsReadyState: this.ws?.readyState
          });
        }
      }
    }, 10000); // Check every 10 seconds (more frequent than before)
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

  /**
   * Start transcript polling as fallback
   */
  private async startTranscriptPolling(): Promise<void> {
    if (!this.elevenLabsConversationId || !this.config.apiKey) {
      logger.error('Cannot start transcript polling - missing conversation ID or API key');
      return;
    }

    if (!this.transcriptPoller) {
      this.transcriptPoller = createTranscriptPoller(this.config.apiKey);
      
      // Forward transcription events
      this.transcriptPoller.on('transcription', (event: TranscriptionEvent) => {
        logger.info('Transcript received via polling fallback', {
          text: event.text,
          speaker: event.speaker
        });
        this.emit('transcription', event);
      });
    }

    await this.transcriptPoller.startPolling(
      this.currentConversationId || '',
      this.elevenLabsConversationId
    );
  }

  /**
   * Stop transcript polling
   */
  private stopTranscriptPolling(): void {
    if (this.transcriptPoller) {
      this.transcriptPoller.stopPolling();
      this.transcriptPoller.removeAllListeners();
      this.transcriptPoller = null;
    }
  }
  /**
   * Schedule polling fallback if we don't receive transcripts
   */
  private schedulePollingFallback(): void {
    // Clear any existing timer
    if (this.pollingFallbackTimer) {
      clearTimeout(this.pollingFallbackTimer);
    }
    
    // Wait 10 seconds to see if we receive transcripts via WebSocket
    this.pollingFallbackTimer = setTimeout(() => {
      if (!this.hasReceivedTranscript && this.elevenLabsConversationId) {
        logger.warn('No transcripts received via WebSocket after 10s, starting polling fallback');
        this.startTranscriptPolling().catch(err => 
          logger.error('Failed to start transcript polling:', {
            message: err instanceof Error ? err.message : 'Unknown error',
            conversationId: this.elevenLabsConversationId
          })
        );
      }
    }, 10000);
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