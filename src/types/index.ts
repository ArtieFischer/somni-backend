import type { User } from '@supabase/supabase-js';

// Express Request extension for authenticated user
declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}

// Transcription request/response types matching frontend contract
export interface TranscribeRequest {
  dreamId: string;
  audioBase64: string;
  duration: number;
  options?: {
    languageCode?: string | null;
    tagAudioEvents?: boolean;
    diarize?: boolean;
  };
}

export interface TranscribeResponse {
  success: boolean;
  dreamId: string;
  transcription?: {
    text: string;
    languageCode?: string | undefined;
    languageProbability?: number | undefined;
    wordCount: number;
    characterCount: number;
  };
  metadata?: {
    duration: number;
    processedAt: string;
    modelId: string;
  };
  error?: string;
}

// ElevenLabs API types
export interface ElevenLabsTranscriptionResult {
  text: string;
  languageCode?: string;
  languageProbability?: number;
  words?: Array<{
    text: string;
    start_time: number;
    end_time: number;
    confidence?: number;
  }>;
}

// Database types matching Supabase schema
export interface DreamRecord {
  id: string;
  user_id: string;
  created_at: string;
  updated_at?: string;
  raw_transcript?: string;
  duration?: number;
  transcription_status?: 'pending' | 'processing' | 'completed' | 'failed';
  transcription_metadata?: Record<string, any>;
  transcription_job_id?: string;
}

// API Error types
export interface ApiError {
  error: string;
  code?: string;
  details?: Record<string, any>;
}

// Health check response
export interface HealthResponse {
  status: 'operational' | 'degraded' | 'down';
  service: string;
  timestamp: string;
  version?: string;
  uptime?: number;
}

// Dream Interpretation types
export interface InterpretationRequest {
  dreamId: string;
  transcript: string;
  interpreterType: InterpreterType;
  userContext?: UserContext;
  options?: InterpretationOptions;
}

export interface InterpretationResponse {
  success: boolean;
  dreamId: string;
  interpretation?: {
    coreMessage: string;
    insights: string[];
    symbols?: SymbolAnalysis[];
    guidance: string;
    reflectiveQuestions: string[];
  };
  metadata?: {
    interpreterType: InterpreterType;
    modelId: string;
    processedAt: string;
    tokenUsage?: TokenUsage;
  };
  error?: string;
}

export type InterpreterType = 'jung' | 'freud' | 'neuroscientist' | 'astrologist';

export interface UserContext {
  age?: number;
  gender?: string;
  currentLifeSituation?: string;
  emotionalState?: string;
  recurringSymbols?: string[];
  recentMajorEvents?: string[];
}

export interface InterpretationOptions {
  depth?: 'initial' | 'deep' | 'transformative';
  includeActiveImagination?: boolean;
  includeShadowWork?: boolean;
}

export interface SymbolAnalysis {
  symbol: string;
  personalMeaning?: string;
  culturalMeaning?: string;
  archetypalMeaning?: string;
}

export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  cost?: number;
}

// OpenRouter API types
export interface OpenRouterCompletion {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

// Rate limiting types
export interface RateLimitInfo {
  limit: number;
  remaining: number;
  reset: number;
  windowMs: number;
}

// Request validation schemas export (for Zod)
export type RequestValidationSchema<T = any> = {
  body?: T;
  query?: T;
  params?: T;
}; 