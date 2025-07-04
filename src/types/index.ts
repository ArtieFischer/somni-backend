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
  duration?: number; // Audio duration in seconds
  options?: {
    languageCode?: string | null;
    tagAudioEvents?: boolean;
    diarize?: boolean;
  };
  locationMetadata?: {
    city?: string;
    country?: string;
    countryCode?: string;
    method?: 'manual' | 'gps';
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
    duration?: number;
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
// NOTE: Consider migrating to the comprehensive types in supabase/types/database.types.ts
export interface DreamRecord {
  id: string;
  user_id: string;
  created_at: string;
  updated_at?: string;
  raw_transcript?: string;
  title?: string;
  transcription_status?: 'pending' | 'processing' | 'completed' | 'failed';
  transcription_metadata?: Record<string, any>;
  transcription_job_id?: string;
  image_prompt?: string;
  is_lucid?: boolean;
  mood?: number; // 1-5
  clarity?: number; // 1-100
  location_metadata?: {
    city?: string;
    country?: string;
    countryCode?: string;
    method?: 'manual' | 'gps';
  };
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

// Dream Interpretation types - Simplified for new JSON format
export interface InterpretationRequest {
  dreamId: string;
  dreamTranscription: string;
  interpreterType: InterpreterType;
  userContext?: UserContext;
  previousDreams?: DreamHistory[];
  analysisDepth?: 'initial' | 'deep' | 'transformative';
  specialPrompts?: {
    synchronicity?: string;
    isNightmare?: boolean;
    customContext?: string;
  };
  testMode?: boolean; // Flag to enable debug features like debate process visibility
}

// New unified dream analysis response format
export interface DreamAnalysis {
  dreamTopic: string;
  symbols: string[];
  quickTake: string;
  dreamWork: string;
  interpretation: string;
  selfReflection: string;
}

// Internal debate process structure
export interface DebateProcess {
  hypothesis_a: string;
  hypothesis_b: string;
  hypothesis_c: string;
  evaluation: string;
  selected_hypothesis: string;
}

// Enhanced response with debate process
export interface DreamAnalysisWithDebate {
  dreamAnalysis: DreamAnalysis;
  debateProcess?: DebateProcess | undefined;
}

export interface InterpretationResponse {
  success: boolean;
  dreamId: string;
  interpretation?: DreamAnalysis | JungianInsights | FreudianInsights | MaryInsights | LakshmiInsights;
  aiResponse?: string; // Raw AI response for debugging
  metadata?: {
    interpreterType: InterpreterType;
    modelUsed: string;
    processedAt: string;
    tokenUsage?: TokenUsage;
    costSummary?: CostSummary;
    analysisDepth: 'initial' | 'deep' | 'transformative';
    duration: number;
  };
  error?: string;
}

export type InterpreterType = 'jung' | 'freud' | 'mary' | 'lakshmi';

// Enhanced UserContext matching the Jungian specification
export interface UserContext {
  age: number;
  gender?: string;
  currentLifeSituation?: string; // What's happening in their life RIGHT NOW
  emotionalState?: string;
  recurringSymbols?: string[];
  recentMajorEvents?: string[];
  lifePhase?: string; // Automatically determined from age
}

export interface DreamHistory {
  dreamId: string;
  transcript: string;
  interpretationDate: string;
  keySymbols?: string[];
  themes?: string[];
}

// Jungian-specific insight structure
export interface JungianInsights {
  type: 'jungian';
  interpretation: string; // Full AI interpretation response
  coreMessage: string;
  phenomenologicalOpening: string; // The initial wonder observation
  symbols: string[]; // Simple array of symbol strings
  shadowAspects?: string[];
  compensatoryFunction: string;
  individuationGuidance: string;
  activeImaginationExercise?: string;
  reflectiveQuestions: string[];
  isBigDream: boolean;
  lifePhaseGuidance?: string;
  animaAnimusContent?: string;
  synchronicityConnection?: string;
}

// Other interpreter insight structures
export interface FreudianInsights {
  type: 'freudian';
  coreMessage: string;
  interpretation: string; // Full AI interpretation response
  symbols: string[]; // Simple array like Jung
  unconsciousDesires: string[];
  childhoodConnections: string[];
  repressionIndicators: string[];
  oedipalDynamics?: string;
  transferenceElements?: string;
  reflectiveQuestions: string[];
  // Optional specialized analyses - only included when LLM detects relevant themes
  professionalAnalysis?: string;
  socialDynamicsAnalysis?: string;
  anxietyAnalysis?: string;
  sexualAnalysis?: string;
  transferenceAnalysis?: string;
}

export interface MaryInsights {
  type: 'mary';
  interpretation: string;
  coreMessage: string;
  symbols: string[]; // Same as Jung/Freud for consistency
  brainActivity: string[];
  sleepStageIndicators: string;
  continuityElements: string[];
  neuroscienceEducation: string;
  reflectiveQuestions: string[];
  // Optional specialized analyses - LLM determines inclusion
  memoryConsolidation?: string;
  threatSimulation?: string;
  emotionalRegulation?: string;
  problemSolving?: string;
  circadianFactors?: string;
}

export interface LakshmiInsights {
  type: 'lakshmi';
  coreMessage: string;
  interpretation: string; // Full AI interpretation response
  symbols: string[]; // Simple array like other interpreters
  spiritualMeaning: string;
  karmicPatterns: string[];
  chakraConnections?: string[];
  lucidDreamingGuidance?: string;
  meditationTechniques: string[];
  yogicPerspective?: string;
  mantras?: string[];
  reflectiveQuestions: string[];
}

// Cost tracking and model management
export interface CostSummary {
  totalCost: number;
  totalRequests: number;
  recentEntries: Array<{
    timestamp: string;
    model: string;
    cost: number;
    tokens: number;
  }>;
}

export interface InterpretationOptions {
  depth?: 'initial' | 'deep' | 'transformative';
  includeActiveImagination?: boolean;
  includeShadowWork?: boolean;
  maxTokens?: number;
  temperature?: number;
  customModelOverride?: string;
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

// Dream Sharing types
export interface SharedDream {
  id: string;
  dream_id: string;
  user_id: string;
  is_anonymous: boolean;
  display_name?: string | null;
  is_active: boolean;
  shared_at: string;
  updated_at: string;
}

export interface ShareDreamRequest {
  isAnonymous: boolean;
  displayName?: string | null;
}

export interface ShareDreamResponse {
  success: boolean;
  shareId: string;
  message?: string;
  error?: string;
}

export interface PublicSharedDream {
  share_id: string;
  dream_id: string;
  dream_title: string | null;
  dream_transcript: string | null;
  dream_created_at: string;
  mood: number | null;
  clarity: number | null;
  is_anonymous: boolean;
  display_name: string | null;
  shared_at: string;
  themes: Array<{
    code: string;
    label: string;
  }>;
  image_url: string | null;
}

export interface GetSharedDreamsParams {
  limit?: number;
  offset?: number;
}

export interface GetSharedDreamsResponse {
  success: boolean;
  dreams: PublicSharedDream[];
  total?: number;
  error?: string;
} 