// Complete TypeScript types for Somni database

// =====================================================================
// ENUMS
// =====================================================================

export type SexEnum = 'male' | 'female' | 'other' | 'unspecified';
export type TranscriptionStatusEnum = 'pending' | 'processing' | 'done' | 'error';
export type SleepPhaseEnum = 'unknown' | 'n1' | 'n2' | 'n3' | 'rem';
export type LocationAccuracyEnum = 'none' | 'country' | 'region' | 'city' | 'exact';
export type MessageSenderEnum = 'user' | 'interpreter' | 'system';

// =====================================================================
// PROFILES
// =====================================================================

export interface ProfileSettings {
  location_sharing?: 'none' | 'country' | 'city' | 'exact';
  sleep_schedule?: {
    bed: string;      // "23:30"
    wake: string;     // "07:00" 
    tz: string;       // "Europe/Warsaw"
  };
  improve_sleep_quality?: boolean;
  interested_in_lucid_dreaming?: boolean;
}

export interface Profile {
  user_id: string;
  handle: string;
  username: string | null;
  sex: SexEnum;
  birth_date: string | null;  // ISO date
  avatar_url: string | null;
  locale: string;
  dream_interpreter: string | null;  // FK to interpreters.id
  is_premium: boolean;
  onboarding_complete: boolean;
  
  // Location fields
  location: { lat: number; lng: number } | null;  // PostGIS point
  location_accuracy: LocationAccuracyEnum;
  location_country: string | null;
  location_city: string | null;
  
  settings: ProfileSettings;
  created_at: string;
  updated_at: string;
}

// =====================================================================
// DREAMS
// =====================================================================

export interface Dream {
  id: string;
  user_id: string;
  created_at: string;
  updated_at: string;
  
  // Content
  title: string | null;
  raw_transcript: string | null;
  refined_narrative: string | null;
  
  // Sleep data
  sleep_phase: SleepPhaseEnum;
  is_lucid: boolean;
  mood_before: number | null;  // -5 to 5
  mood_after: number | null;   // -5 to 5
  
  // Location
  location: { lat: number; lng: number } | null;
  location_accuracy: LocationAccuracyEnum;
  
  // AI/ML
  embedding: number[] | null;  // 384-dim vector
  image_prompt: string | null;
  
  // Transcription
  transcription_status: TranscriptionStatusEnum;
  transcription_metadata: Record<string, any> | null;
  transcription_job_id: string | null;
}

// =====================================================================
// DREAM IMAGES
// =====================================================================

export interface DreamImage {
  id: string;
  dream_id: string;
  storage_path: string;
  is_primary: boolean;
  generated_at: string;
}

// =====================================================================
// THEMES
// =====================================================================

export interface Theme {
  code: string;              // e.g., 'falling'
  label: string;             // Display name
  description: string | null;
  embedding: number[] | null; // 384-dim vector
  created_at: string;
}

export interface DreamTheme {
  dream_id: string;
  theme_code: string;
  rank: number;              // 1-10
  score: number;             // Cosine similarity
  explanation: string | null;
}

// =====================================================================
// INTERPRETATIONS
// =====================================================================

export interface Interpretation {
  id: string;
  dream_id: string;
  interpreter_id: string;
  interpretation: string;
  key_symbols: Record<string, any> | null;
  advice: string | null;
  mood_analysis: Record<string, any> | null;
  created_at: string;
  version: number;
}

// =====================================================================
// INTERPRETERS
// =====================================================================

export interface InterpreterStyle {
  approach: string;
  focus: string[];
}

export interface Interpreter {
  id: string;              // 'carl', 'sigmund', etc.
  name: string;
  full_name: string;
  description: string;
  image_url: string;
  interpretation_style: InterpreterStyle;
  created_at: string;
}

// =====================================================================
// CONVERSATIONS & MESSAGES
// =====================================================================

export interface Conversation {
  id: string;
  user_id: string;
  interpreter_id: string | null;
  dream_id: string | null;
  started_at: string;
  last_message_at: string | null;
}

export interface Message {
  id: number;
  conversation_id: string;
  sender: MessageSenderEnum;
  content: string;
  embedding: number[] | null;  // 384-dim vector
  created_at: string;
}

// =====================================================================
// KNOWLEDGE BASE
// =====================================================================

export interface KnowledgeBase {
  id: number;
  interpreter_type: 'jung' | 'freud' | 'mary' | 'lakshmi' | 'universal';
  source: string;
  chapter: string | null;
  content: string;
  content_type: 'theory' | 'symbol' | 'case_study' | 'dream_example';
  metadata: Record<string, any>;
  embedding: number[] | null;  // 384-dim vector
  created_at: string;
}

// =====================================================================
// TRANSCRIPTION USAGE
// =====================================================================

export interface TranscriptionUsage {
  id: string;
  user_id: string;
  dream_id: string;
  duration_seconds: number;
  provider: string;
  created_at: string;
}

// =====================================================================
// INSERT/UPDATE TYPES
// =====================================================================

export interface ProfileInsert {
  user_id: string;
  handle: string;
  username?: string | null;
  sex?: SexEnum;
  birth_date?: string | null;
  avatar_url?: string | null;
  locale?: string;
  dream_interpreter?: string | null;
  is_premium?: boolean;
  onboarding_complete?: boolean;
  location?: { lat: number; lng: number } | null;
  location_accuracy?: LocationAccuracyEnum;
  location_country?: string | null;
  location_city?: string | null;
  settings?: ProfileSettings;
}

export interface DreamInsert {
  user_id: string;
  title?: string | null;
  raw_transcript?: string | null;
  refined_narrative?: string | null;
  sleep_phase?: SleepPhaseEnum;
  is_lucid?: boolean;
  mood_before?: number | null;
  mood_after?: number | null;
  location?: { lat: number; lng: number } | null;
  location_accuracy?: LocationAccuracyEnum;
  embedding?: number[] | null;
  transcription_status?: TranscriptionStatusEnum;
  transcription_metadata?: Record<string, any> | null;
  transcription_job_id?: string | null;
  image_prompt?: string | null;
}

export interface ThemeInsert {
  code: string;
  label: string;
  description?: string | null;
  embedding?: number[] | null;
}

export interface InterpretationInsert {
  dream_id: string;
  interpreter_id: string;
  interpretation: string;
  key_symbols?: Record<string, any> | null;
  advice?: string | null;
  mood_analysis?: Record<string, any> | null;
  version?: number;
}

// =====================================================================
// FUNCTION RESPONSES
// =====================================================================

export interface ThemeSearchResult {
  code: string;
  label: string;
  score: number;
}

export interface KnowledgeSearchResult {
  id: number;
  content: string;
  source: string;
  chapter: string | null;
  content_type: string;
  similarity: number;
}

// =====================================================================
// EDGE FUNCTION TYPES
// =====================================================================

export interface EmbedDreamRequest {
  dream_id: string;
  transcript: string;
  extract_themes?: boolean;
}

export interface EmbedDreamResponse {
  success: boolean;
  dream_id: string;
  embedding_size: number;
  themes_found: number;
  themes: ThemeSearchResult[];
}

export interface EmbedThemesRequest {
  themes: ThemeInsert[];
}

export interface EmbedThemesResponse {
  success: boolean;
  processed: number;
  results: Array<{
    code: string;
    success: boolean;
    error?: string;
  }>;
}