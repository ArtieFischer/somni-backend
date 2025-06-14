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
    languageCode?: string;
    languageProbability?: number;
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