export interface ElevenLabsConfig {
  apiKey: string;
  agentId: string;
  voiceSettings?: {
    stability?: number;
    similarityBoost?: number;
    style?: number;
    useSpeakerBoost?: boolean;
  };
}

export interface ElevenLabsWebSocketConfig {
  authorization: string;
  agentId: string;
  conversationId?: string;
}

export interface AudioChunk {
  data: ArrayBuffer;
  timestamp: number;
  sequence: number;
}

export interface TranscriptionEvent {
  text: string;
  speaker: 'user' | 'agent';
  timestamp: number;
  isFinal: boolean;
}

export interface ElevenLabsError {
  code: string;
  message: string;
  details?: any;
}