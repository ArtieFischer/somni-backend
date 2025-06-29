/**
 * Database Types for Somni
 * Generated based on the Supabase schema
 */

// =====================================================================
// ENUMS
// =====================================================================

export type SexEnum = 'male' | 'female' | 'other' | 'unspecified';

export type TranscriptionStatusEnum = 'pending' | 'processing' | 'completed' | 'failed';

export type SleepPhaseEnum = 'unknown' | 'n1' | 'n2' | 'n3' | 'rem';

export type LocationAccuracyEnum = 'none' | 'country' | 'region' | 'city' | 'exact';

export type ConversationStatusEnum = 'active' | 'ended' | 'error';

export type ImplementationTypeEnum = 'websocket' | 'elevenlabs';

export type MessageSenderEnum = 'user' | 'interpreter' | 'system';

export type MessageRoleEnum = 'user' | 'assistant';

export type EmbeddingStatusEnum = 'pending' | 'processing' | 'completed' | 'failed' | 'skipped';

export type JobStatusEnum = 'pending' | 'processing' | 'completed' | 'failed';

// =====================================================================
// JSON TYPES
// =====================================================================

export interface InterpretationStyle {
  approach: string;
  focus: string[];
}

export interface ProfileSettings {
  location_sharing: string;
  sleep_schedule: any | null;
  improve_sleep_quality: any | null;
  interested_in_lucid_dreaming: any | null;
}

export interface LocationMetadata {
  city?: string;
  country?: string;
  countryCode?: string;
  method: 'manual' | 'gps';
}

export interface EmotionalTone {
  primary: string;
  secondary: string;
  intensity: number;
}

export interface ElevenLabsMetadata {
  audio_url?: string;
  [key: string]: any;
}

// =====================================================================
// TABLE TYPES
// =====================================================================

export interface Interpreters {
  id: string;
  name: string;
  full_name: string;
  description: string;
  image_url: string;
  interpretation_style: InterpretationStyle;
  created_at: string;
}

export interface Profiles {
  user_id: string;
  handle: string;
  username: string | null;
  sex: SexEnum;
  birth_date: string | null;
  avatar_url: string | null;
  locale: string;
  dream_interpreter: string | null;
  is_premium: boolean;
  onboarding_complete: boolean;
  location: any | null; // PostGIS geography point
  location_accuracy: LocationAccuracyEnum | null;
  location_country: string | null;
  location_city: string | null;
  settings: ProfileSettings;
  created_at: string;
  updated_at: string;
}

export interface Dreams {
  id: string;
  user_id: string;
  created_at: string;
  updated_at: string;
  title: string | null;
  raw_transcript: string | null;
  is_lucid: boolean;
  mood: number | null; // 1-5
  clarity: number | null; // 1-100
  location_metadata: LocationMetadata | null;
  transcription_status: TranscriptionStatusEnum;
  transcription_metadata: any | null;
  transcription_job_id: string | null;
  image_prompt: string | null;
  embedding_status: EmbeddingStatusEnum | null;
  embedding_error: string | null;
  embedding_attempts: number | null;
  embedding_processed_at: string | null;
  embedding_started_at: string | null;
}

export interface DreamImages {
  id: string;
  dream_id: string;
  storage_path: string;
  is_primary: boolean | null;
  generated_at: string;
}

export interface Themes {
  code: string;
  label: string;
  description: string | null;
  embedding: any | null; // vector(384)
  created_at: string | null;
}

export interface DreamThemes {
  dream_id: string;
  theme_code: string;
  rank: number | null;
  score: number | null;
  explanation: string | null;
  similarity: number | null;
  chunk_index: number | null;
  extracted_at: string | null;
}

export interface Interpretations {
  id: string;
  dream_id: string;
  user_id: string;
  interpreter_type: string;
  interpretation_summary: string;
  full_response: any;
  dream_topic: string;
  quick_take: string;
  symbols: string[] | null;
  emotional_tone: EmotionalTone | null;
  primary_insight: string | null;
  key_pattern: string | null;
  knowledge_fragments_used: number | null;
  total_fragments_retrieved: number | null;
  fragment_ids_used: string[] | null;
  processing_time_ms: number | null;
  model_used: string | null;
  created_at: string;
  updated_at: string;
  version: number | null;
  previous_version_id: string | null;
}

export interface Conversations {
  id: string;
  user_id: string;
  interpreter_id: string | null;
  dream_id: string | null;
  started_at: string;
  last_message_at: string | null;
  status: ConversationStatusEnum;
  ended_at: string | null;
  elevenlabs_session_id: string | null;
  elevenlabs_agent_id: string | null;
  implementation_type: ImplementationTypeEnum | null;
}

export interface Messages {
  id: number;
  conversation_id: string;
  sender: MessageSenderEnum;
  content: string;
  embedding: any | null; // vector(384)
  created_at: string;
  role: MessageRoleEnum;
  audio_url: string | null;
  elevenlabs_metadata: ElevenLabsMetadata | null;
}

export interface KnowledgeBase {
  id: number;
  interpreter_type: 'jung' | 'freud' | 'mary' | 'lakshmi' | 'universal';
  source: string;
  chapter: string | null;
  content: string;
  content_type: string;
  metadata: any | null;
  embedding: any | null; // vector(384)
  created_at: string | null;
}

export interface TranscriptionUsage {
  id: string;
  user_id: string;
  dream_id: string;
  duration_seconds: number;
  provider: string | null;
  created_at: string;
  language_code: string | null;
  character_count: number | null;
}

export interface ElevenLabsSessions {
  id: string;
  user_id: string;
  conversation_id: string;
  agent_id: string;
  session_token: string;
  expires_at: string;
  created_at: string | null;
  updated_at: string | null;
}

export interface DreamEmbeddings {
  id: number;
  dream_id: string;
  embedding: any; // vector(1024)
  chunk_index: number;
  chunk_text: string;
  token_count: number;
  embedding_version: string;
  processing_time_ms: number | null;
  metadata: any | null;
  created_at: string | null;
}

export interface EmbeddingJobs {
  id: number;
  dream_id: string;
  status: JobStatusEnum;
  priority: number | null;
  attempts: number | null;
  max_attempts: number | null;
  error_message: string | null;
  scheduled_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string | null;
}

// =====================================================================
// DATABASE INTERFACE
// =====================================================================

export interface Database {
  public: {
    Tables: {
      interpreters: {
        Row: Interpreters;
        Insert: Omit<Interpreters, 'created_at'>;
        Update: Partial<Omit<Interpreters, 'id' | 'created_at'>>;
      };
      profiles: {
        Row: Profiles;
        Insert: Omit<Profiles, 'created_at' | 'updated_at'> & {
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<Profiles, 'user_id' | 'created_at' | 'updated_at'>>;
      };
      dreams: {
        Row: Dreams;
        Insert: Omit<Dreams, 'id' | 'created_at' | 'updated_at'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<Dreams, 'id' | 'user_id' | 'created_at' | 'updated_at'>>;
      };
      dream_images: {
        Row: DreamImages;
        Insert: Omit<DreamImages, 'id' | 'generated_at'> & {
          id?: string;
          generated_at?: string;
        };
        Update: Partial<Omit<DreamImages, 'id' | 'dream_id' | 'generated_at'>>;
      };
      themes: {
        Row: Themes;
        Insert: Omit<Themes, 'created_at'> & {
          created_at?: string;
        };
        Update: Partial<Omit<Themes, 'code'>>;
      };
      dream_themes: {
        Row: DreamThemes;
        Insert: DreamThemes;
        Update: Partial<Omit<DreamThemes, 'dream_id' | 'theme_code'>>;
      };
      interpretations: {
        Row: Interpretations;
        Insert: Omit<Interpretations, 'id' | 'created_at' | 'updated_at'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<Interpretations, 'id' | 'dream_id' | 'user_id' | 'created_at' | 'updated_at'>>;
      };
      conversations: {
        Row: Conversations;
        Insert: Omit<Conversations, 'id' | 'started_at'> & {
          id?: string;
          started_at?: string;
        };
        Update: Partial<Omit<Conversations, 'id' | 'user_id' | 'started_at'>>;
      };
      messages: {
        Row: Messages;
        Insert: Omit<Messages, 'id' | 'created_at'> & {
          id?: number;
          created_at?: string;
        };
        Update: Partial<Omit<Messages, 'id' | 'conversation_id' | 'created_at'>>;
      };
      knowledge_base: {
        Row: KnowledgeBase;
        Insert: Omit<KnowledgeBase, 'id' | 'created_at'> & {
          created_at?: string;
        };
        Update: Partial<Omit<KnowledgeBase, 'id'>>;
      };
      transcription_usage: {
        Row: TranscriptionUsage;
        Insert: Omit<TranscriptionUsage, 'id' | 'created_at'> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Omit<TranscriptionUsage, 'id' | 'user_id' | 'dream_id' | 'created_at'>>;
      };
      elevenlabs_sessions: {
        Row: ElevenLabsSessions;
        Insert: Omit<ElevenLabsSessions, 'id' | 'created_at' | 'updated_at'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<ElevenLabsSessions, 'id' | 'user_id' | 'conversation_id' | 'created_at' | 'updated_at'>>;
      };
      dream_embeddings: {
        Row: DreamEmbeddings;
        Insert: Omit<DreamEmbeddings, 'id' | 'created_at'> & {
          created_at?: string;
        };
        Update: Partial<Omit<DreamEmbeddings, 'id' | 'dream_id'>>;
      };
      embedding_jobs: {
        Row: EmbeddingJobs;
        Insert: Omit<EmbeddingJobs, 'id' | 'created_at'> & {
          created_at?: string;
        };
        Update: Partial<Omit<EmbeddingJobs, 'id' | 'dream_id'>>;
      };
    };
    Views: {
      // Add any views here
    };
    Functions: {
      search_themes: {
        Args: {
          query_embedding: any; // vector(384)
          similarity_threshold?: number;
          max_results?: number;
        };
        Returns: {
          code: string;
          label: string;
          score: number;
        }[];
      };
      search_knowledge: {
        Args: {
          query_embedding: any; // vector(384)
          target_interpreter?: string;
          similarity_threshold?: number;
          max_results?: number;
        };
        Returns: {
          id: number;
          content: string;
          source: string;
          chapter: string;
          content_type: string;
          similarity: number;
        }[];
      };
      search_similar_dreams: {
        Args: {
          query_embedding: any; // vector(1024)
          user_id_filter?: string;
          similarity_threshold?: number;
          max_results?: number;
        };
        Returns: {
          dream_id: string;
          similarity: number;
          chunk_text: string;
          chunk_index: number;
          dream_title: string;
          created_at: string;
        }[];
      };
      get_dream_themes: {
        Args: {
          p_dream_id: string;
          p_min_similarity?: number;
        };
        Returns: {
          theme_code: string;
          theme_label: string;
          theme_description: string;
          similarity: number;
        }[];
      };
      search_knowledge_bge: {
        Args: {
          query_embedding: any; // vector(1024)
          query_sparse?: any;
          query_text?: string;
          interpreter_filter?: string;
          source_filter?: string;
          use_adaptive_scoring?: boolean;
          match_count?: number;
          semantic_weight?: number;
          sparse_weight?: number;
          bm25_weight?: number;
        };
        Returns: {
          id: number;
          content: string;
          source: string;
          chapter: string;
          metadata: any;
          semantic_score: number;
          sparse_score: number;
          bm25_score: number;
          hybrid_score: number;
        }[];
      };
      search_knowledge_semantic: {
        Args: {
          query_embedding: any; // vector(1024)
          interpreter_filter?: string;
          match_threshold?: number;
          match_count?: number;
        };
        Returns: {
          id: number;
          text: string;
          source: string;
          chapter: number;
          metadata: any;
          similarity: number;
        }[];
      };
    };
    Enums: {
      sex_enum: SexEnum;
      transcription_status_enum: TranscriptionStatusEnum;
      sleep_phase_enum: SleepPhaseEnum;
      loc_accuracy_enum: LocationAccuracyEnum;
      conversation_status_enum: ConversationStatusEnum;
      implementation_type_enum: ImplementationTypeEnum;
    };
  };
}

// =====================================================================
// RELATIONSHIP DEFINITIONS
// =====================================================================

export interface ProfilesRelations extends Profiles {
  interpreter?: Interpreters;
  dreams?: Dreams[];
  conversations?: Conversations[];
  transcription_usage?: TranscriptionUsage[];
  elevenlabs_sessions?: ElevenLabsSessions[];
  interpretations?: Interpretations[];
}

export interface DreamsRelations extends Dreams {
  user?: Profiles;
  images?: DreamImages[];
  themes?: (DreamThemes & { theme: Themes })[];
  interpretations?: Interpretations[];
  conversations?: Conversations[];
  transcription_usage?: TranscriptionUsage[];
  embeddings?: DreamEmbeddings[];
  embedding_job?: EmbeddingJobs;
}

export interface ConversationsRelations extends Conversations {
  user?: Profiles;
  interpreter?: Interpreters;
  dream?: Dreams;
  messages?: Messages[];
  elevenlabs_session?: ElevenLabsSessions;
}

export interface MessagesRelations extends Messages {
  conversation?: Conversations;
}

export interface InterpretationsRelations extends Interpretations {
  dream?: Dreams;
  user?: Profiles;
  interpreter?: Interpreters;
  previous_version?: Interpretations;
}

export interface ElevenLabsSessionsRelations extends ElevenLabsSessions {
  user?: Profiles;
  conversation?: Conversations;
}

// =====================================================================
// HELPER TYPES
// =====================================================================

export type TablesInsert<T extends keyof Database['public']['Tables']> = 
  Database['public']['Tables'][T]['Insert'];

export type TablesUpdate<T extends keyof Database['public']['Tables']> = 
  Database['public']['Tables'][T]['Update'];

export type TablesRow<T extends keyof Database['public']['Tables']> = 
  Database['public']['Tables'][T]['Row'];

export type Enums<T extends keyof Database['public']['Enums']> = 
  Database['public']['Enums'][T];

// Type for the auth.users table reference
export interface AuthUser {
  id: string;
  email?: string;
  created_at: string;
  updated_at?: string;
  raw_user_meta_data?: {
    handle?: string;
    username?: string;
    display_name?: string;
    full_name?: string;
    sex?: string;
    locale?: string;
  };
}