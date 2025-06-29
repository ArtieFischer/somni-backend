-- =====================================================================
-- SOMNI CLEAN INITIAL SCHEMA
-- Complete database schema with all tables, functions, and RLS policies
-- Generated from production database state
-- =====================================================================

-- =====================================================================
-- EXTENSIONS
-- =====================================================================
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS vector;

-- =====================================================================
-- ENUMS AND CUSTOM TYPES
-- =====================================================================

-- Conversation status
CREATE TYPE conversation_status_enum AS ENUM ('active', 'ended', 'error');

-- Location accuracy
CREATE TYPE loc_accuracy_enum AS ENUM ('none', 'manual', 'exact');

-- User sex/gender
CREATE TYPE sex_enum AS ENUM ('male', 'female', 'other', 'unspecified');

-- Sleep phases (legacy, not actively used)
CREATE TYPE sleep_phase_enum AS ENUM ('unknown', 'n1', 'n2', 'n3', 'rem');

-- Transcription processing status
CREATE TYPE transcription_status_enum AS ENUM (
  'pending', 
  'processing', 
  'done',       -- Legacy value (use 'completed' instead)
  'error',      -- Legacy value (use 'failed' instead)
  'completed',  -- New value replacing 'done'
  'failed'      -- New value replacing 'error'
);

-- =====================================================================
-- CORE TABLES
-- =====================================================================

-- INTERPRETERS TABLE (Must be created before profiles due to FK)
CREATE TABLE interpreters (
  id text PRIMARY KEY,
  name text NOT NULL,
  full_name text NOT NULL,
  description text NOT NULL,
  image_url text NOT NULL,
  interpretation_style jsonb NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Insert the 4 dream interpreters
INSERT INTO interpreters (id, name, full_name, description, image_url, interpretation_style) VALUES
  ('carl', 'Carl', 'Carl Jung', 'Explores collective unconscious and universal archetypes in your dreams', '/storage/v1/object/public/interpreters/carl.jpg', '{"approach": "jungian", "focus": ["archetypes", "collective_unconscious", "individuation"]}'),
  ('sigmund', 'Sigmund', 'Sigmund Freud', 'Analyzes dreams as wish fulfillment and unconscious desires', '/storage/v1/object/public/interpreters/sigmund.jpg', '{"approach": "freudian", "focus": ["wish_fulfillment", "unconscious_desires", "symbolism"]}'),
  ('lakshmi', 'Lakshmi', 'Lakshmi Devi', 'Interprets dreams through spiritual and karmic perspectives', '/storage/v1/object/public/interpreters/lakshmi.jpg', '{"approach": "spiritual", "focus": ["karma", "spiritual_growth", "consciousness"]}'),
  ('mary', 'Mary', 'Mary Whiton', 'Uses modern cognitive science to understand dream meanings', '/storage/v1/object/public/interpreters/mary.jpg', '{"approach": "cognitive", "focus": ["memory_processing", "problem_solving", "neuroscience"]}');

-- PROFILES TABLE
CREATE TABLE profiles (
  user_id uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  handle text NOT NULL UNIQUE,
  username text,
  sex sex_enum NOT NULL DEFAULT 'unspecified',
  birth_date date,
  avatar_url text,
  locale varchar(10) NOT NULL DEFAULT 'en',
  dream_interpreter text REFERENCES interpreters(id),
  is_premium boolean NOT NULL DEFAULT false,
  onboarding_complete boolean NOT NULL DEFAULT false,
  
  -- Location data (legacy geographic fields)
  location geography(Point,4326),
  location_accuracy loc_accuracy_enum NOT NULL DEFAULT 'none',
  location_country text,
  location_city text,
  
  -- Push notifications
  push_token text,
  push_token_platform text CHECK (push_token_platform IN ('ios', 'android')),
  push_token_updated_at timestamptz,
  
  -- Settings and preferences
  settings jsonb NOT NULL DEFAULT '{
    "sleep_schedule": null,
    "location_sharing": "none",
    "improve_sleep_quality": null,
    "interested_in_lucid_dreaming": null
  }'::jsonb,
  
  notification_preferences jsonb DEFAULT '{
    "reminders": true,
    "achievements": true,
    "interpretations": true
  }'::jsonb,
  
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- DREAMS TABLE
CREATE TABLE dreams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  
  -- Timestamps
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  
  -- Content
  title text,                          -- LLM-generated title
  raw_transcript text,                 -- Voice-to-text transcript
  image_prompt text,                   -- Prompt for image generation
  
  -- Dream attributes
  is_lucid boolean NOT NULL DEFAULT false,
  mood smallint CHECK (mood >= 1 AND mood <= 5),
  clarity smallint CHECK (clarity >= 1 AND clarity <= 100),
  
  -- Location (new format)
  location_metadata jsonb,             -- {city, country, countryCode, method}
  
  -- Transcription tracking
  transcription_status transcription_status_enum NOT NULL DEFAULT 'pending',
  transcription_metadata jsonb,
  transcription_job_id text,
  
  -- Embedding status (for BGE-M3 embeddings)
  embedding_status text DEFAULT 'pending' CHECK (
    embedding_status IN ('pending', 'processing', 'completed', 'failed', 'skipped')
  ),
  embedding_error text,
  embedding_attempts integer DEFAULT 0 CHECK (embedding_attempts >= 0 AND embedding_attempts <= 3),
  embedding_processed_at timestamptz,
  embedding_started_at timestamptz
);

-- DREAM_IMAGES TABLE
CREATE TABLE dream_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dream_id uuid NOT NULL REFERENCES dreams(id) ON DELETE CASCADE,
  storage_path text NOT NULL,
  is_primary boolean DEFAULT false,
  generated_at timestamptz NOT NULL DEFAULT now()
);

-- THEMES TABLE (Dream theme definitions)
CREATE TABLE themes (
  code text PRIMARY KEY,
  label text NOT NULL,
  description text,
  
  -- BGE-M3 embeddings
  embedding vector(1024),
  sparse_embedding jsonb,
  embedding_version text DEFAULT 'bge-m3',
  
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- DREAM_THEMES TABLE (Many-to-many: dreams <-> themes)
CREATE TABLE dream_themes (
  dream_id uuid NOT NULL REFERENCES dreams(id) ON DELETE CASCADE,
  theme_code text NOT NULL REFERENCES themes(code),
  
  -- Legacy fields (kept for compatibility)
  rank smallint,
  score real,
  explanation text,
  
  -- New fields for BGE-M3 system
  similarity float8 CHECK (similarity >= 0 AND similarity <= 1),
  chunk_index integer,
  extracted_at timestamptz DEFAULT now(),
  
  PRIMARY KEY (dream_id, theme_code),
  UNIQUE (dream_id, theme_code)
);

-- DREAM_EMBEDDINGS TABLE (BGE-M3 embeddings for dreams)
CREATE TABLE dream_embeddings (
  id bigserial PRIMARY KEY,
  dream_id uuid NOT NULL REFERENCES dreams(id) ON DELETE CASCADE,
  embedding vector(1024) NOT NULL,
  chunk_index integer NOT NULL DEFAULT 0,
  chunk_text text NOT NULL,
  token_count integer NOT NULL CHECK (token_count > 0),
  embedding_version text NOT NULL DEFAULT 'bge-m3-v1',
  processing_time_ms integer,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  
  UNIQUE (dream_id, chunk_index, embedding_version)
);

-- INTERPRETATIONS TABLE
CREATE TABLE interpretations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dream_id uuid NOT NULL REFERENCES dreams(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  interpreter_type text NOT NULL REFERENCES interpreters(id),
  
  -- Core interpretation content
  interpretation_summary text NOT NULL,
  full_response jsonb NOT NULL,
  dream_topic text NOT NULL,
  quick_take text NOT NULL,
  
  -- Extracted insights
  symbols text[] DEFAULT '{}',
  emotional_tone jsonb,
  primary_insight text,
  key_pattern text,
  
  -- Knowledge base usage tracking
  knowledge_fragments_used integer DEFAULT 0,
  total_fragments_retrieved integer DEFAULT 0,
  fragment_ids_used text[] DEFAULT '{}',
  
  -- Metadata
  processing_time_ms integer,
  model_used text DEFAULT 'gpt-4o',
  version integer DEFAULT 1,
  previous_version_id uuid REFERENCES interpretations(id),
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  UNIQUE (dream_id, interpreter_type, version)
);

-- CONVERSATIONS TABLE
CREATE TABLE conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  interpreter_id text REFERENCES interpreters(id),
  dream_id uuid REFERENCES dreams(id) ON DELETE SET NULL,
  
  -- Timestamps
  started_at timestamptz NOT NULL DEFAULT now(),
  last_message_at timestamptz,
  ended_at timestamptz,
  resumed_at timestamptz,
  
  -- Status
  status conversation_status_enum NOT NULL DEFAULT 'active',
  
  -- Implementation details
  implementation_type varchar(50) DEFAULT 'websocket' CHECK (
    implementation_type IN ('websocket', 'elevenlabs')
  ),
  
  -- ElevenLabs integration
  elevenlabs_session_id text,
  elevenlabs_agent_id varchar(255),
  
  metadata jsonb DEFAULT '{}'
);

-- MESSAGES TABLE
CREATE TABLE messages (
  id bigserial PRIMARY KEY,
  conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  
  -- Message content
  content text NOT NULL,
  role text NOT NULL CHECK (role IN ('user', 'assistant')),
  
  -- Optional fields
  audio_url text,
  embedding vector(384),              -- For semantic search
  elevenlabs_metadata jsonb,
  
  created_at timestamptz NOT NULL DEFAULT now()
);

-- KNOWLEDGE_BASE TABLE (Legacy RAG system - being phased out)
CREATE TABLE knowledge_base (
  id bigserial PRIMARY KEY,
  interpreter_type text NOT NULL CHECK (
    interpreter_type IN ('jung', 'freud', 'mary', 'lakshmi', 'universal')
  ),
  source text NOT NULL,
  chapter text,
  content text NOT NULL,
  content_type text NOT NULL,
  metadata jsonb DEFAULT '{}',
  embedding vector(384),              -- MiniLM embeddings
  created_at timestamptz DEFAULT now()
);

-- KNOWLEDGE_FRAGMENTS TABLE (New knowledge system)
CREATE TABLE knowledge_fragments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source text NOT NULL,
  author text NOT NULL CHECK (author IN ('jung', 'freud', 'mary', 'lakshmi')),
  chapter integer,
  text text NOT NULL,
  embedding vector(1024),             -- BGE-M3 embeddings
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- FRAGMENT_THEMES TABLE (Knowledge fragments <-> themes)
CREATE TABLE fragment_themes (
  fragment_id uuid NOT NULL REFERENCES knowledge_fragments(id) ON DELETE CASCADE,
  theme_code text NOT NULL REFERENCES themes(code),
  similarity real NOT NULL,
  created_at timestamptz DEFAULT now(),
  
  PRIMARY KEY (fragment_id, theme_code)
);

-- TRANSCRIPTION_USAGE TABLE (Billing/usage tracking)
CREATE TABLE transcription_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  dream_id uuid NOT NULL REFERENCES dreams(id) ON DELETE CASCADE,
  duration_seconds integer NOT NULL,
  provider text DEFAULT 'whisper',
  language text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- EMBEDDING_JOBS TABLE (Async job queue)
CREATE TABLE embedding_jobs (
  id bigserial PRIMARY KEY,
  dream_id uuid NOT NULL REFERENCES dreams(id) ON DELETE CASCADE UNIQUE,
  status text NOT NULL DEFAULT 'pending' CHECK (
    status IN ('pending', 'processing', 'completed', 'failed')
  ),
  priority integer DEFAULT 0,
  attempts integer DEFAULT 0 CHECK (attempts >= 0 AND attempts <= 3),
  error_message text,
  processing_started_at timestamptz,
  processing_completed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ELEVENLABS_SESSIONS TABLE
CREATE TABLE elevenlabs_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  conversation_id uuid REFERENCES conversations(id) ON DELETE SET NULL,
  agent_id varchar(255) NOT NULL,
  session_token text NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- =====================================================================
-- INDEXES
-- =====================================================================

-- Profiles indexes
CREATE INDEX idx_profiles_locale ON profiles(locale);
CREATE INDEX idx_profiles_interpreter ON profiles(dream_interpreter);
CREATE INDEX idx_profiles_is_premium ON profiles(is_premium) WHERE is_premium = true;
CREATE INDEX idx_profiles_location ON profiles USING gist(location);
CREATE INDEX idx_profiles_push_token ON profiles(push_token) WHERE push_token IS NOT NULL;

-- Dreams indexes
CREATE INDEX idx_dreams_user_id ON dreams(user_id);
CREATE INDEX idx_dreams_created_at ON dreams(created_at DESC);
CREATE INDEX idx_dreams_mood ON dreams(mood) WHERE mood IS NOT NULL;
CREATE INDEX idx_dreams_clarity ON dreams(clarity) WHERE clarity IS NOT NULL;
CREATE INDEX idx_dreams_location_metadata ON dreams USING gin(location_metadata) 
  WHERE location_metadata IS NOT NULL;
CREATE INDEX idx_dreams_transcription_status ON dreams(transcription_status);
CREATE INDEX idx_dreams_embedding_status ON dreams(embedding_status);
CREATE INDEX idx_dreams_embedding_attempts ON dreams(embedding_attempts) 
  WHERE embedding_attempts > 0;

-- Dream images indexes
CREATE INDEX idx_dream_images_dream ON dream_images(dream_id);
CREATE INDEX idx_dream_images_primary ON dream_images(dream_id) WHERE is_primary = true;

-- Themes indexes
CREATE INDEX idx_themes_embedding ON themes USING hnsw (embedding vector_cosine_ops);

-- Dream themes indexes
CREATE INDEX idx_dream_themes_theme ON dream_themes(theme_code);
CREATE INDEX idx_dream_themes_similarity ON dream_themes(similarity DESC);

-- Dream embeddings indexes
CREATE INDEX idx_dream_embeddings_dream ON dream_embeddings(dream_id);
CREATE INDEX idx_dream_embeddings_vector ON dream_embeddings 
  USING hnsw (embedding vector_cosine_ops);

-- Interpretations indexes
CREATE INDEX idx_interpretations_dream ON interpretations(dream_id);
CREATE INDEX idx_interpretations_user ON interpretations(user_id);
CREATE INDEX idx_interpretations_interpreter ON interpretations(interpreter_type);
CREATE INDEX idx_interpretations_created ON interpretations(created_at DESC);

-- Conversations indexes
CREATE INDEX idx_conversations_user ON conversations(user_id);
CREATE INDEX idx_conversations_status ON conversations(status);
CREATE INDEX idx_conversations_started ON conversations(started_at DESC);
CREATE INDEX idx_conversations_elevenlabs_session ON conversations(elevenlabs_session_id) 
  WHERE elevenlabs_session_id IS NOT NULL;

-- Messages indexes
CREATE INDEX idx_messages_conversation ON messages(conversation_id);
CREATE INDEX idx_messages_created ON messages(created_at);
CREATE INDEX idx_messages_embedding ON messages USING ivfflat (embedding vector_cosine_ops) 
  WITH (lists = 100);

-- Knowledge base indexes
CREATE INDEX idx_kb_interpreter ON knowledge_base(interpreter_type);
CREATE INDEX idx_kb_content_type ON knowledge_base(content_type);
CREATE INDEX idx_kb_embedding ON knowledge_base USING ivfflat (embedding vector_cosine_ops) 
  WITH (lists = 100);

-- Knowledge fragments indexes
CREATE INDEX idx_fragments_author ON knowledge_fragments(author);
CREATE INDEX idx_fragments_source ON knowledge_fragments(source);
CREATE INDEX idx_fragments_embedding ON knowledge_fragments 
  USING hnsw (embedding vector_cosine_ops);

-- Fragment themes indexes
CREATE INDEX idx_fragment_themes_theme ON fragment_themes(theme_code);
CREATE INDEX idx_fragment_themes_similarity ON fragment_themes(similarity DESC);

-- Transcription usage indexes
CREATE INDEX idx_transcription_usage_user ON transcription_usage(user_id);
CREATE INDEX idx_transcription_usage_created ON transcription_usage(created_at);

-- Embedding jobs indexes
CREATE INDEX idx_embedding_jobs_status ON embedding_jobs(status);
CREATE INDEX idx_embedding_jobs_priority ON embedding_jobs(priority DESC, created_at ASC)
  WHERE status = 'pending';
CREATE INDEX idx_embedding_jobs_dream ON embedding_jobs(dream_id);

-- ElevenLabs sessions indexes
CREATE INDEX idx_elevenlabs_sessions_user ON elevenlabs_sessions(user_id);
CREATE INDEX idx_elevenlabs_sessions_conversation ON elevenlabs_sessions(conversation_id);
CREATE INDEX idx_elevenlabs_sessions_expires ON elevenlabs_sessions(expires_at);

-- =====================================================================
-- FUNCTIONS
-- =====================================================================

-- Auto-update timestamp function
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

-- Handle new user creation
CREATE OR REPLACE FUNCTION handle_new_user() 
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.profiles (
    user_id, 
    handle,
    username,
    sex,
    locale
  )
  VALUES (
    new.id,
    COALESCE(
      new.raw_user_meta_data->>'handle', 
      new.raw_user_meta_data->>'username', 
      'user_' || substring(new.id::text, 1, 8)
    ),
    COALESCE(
      new.raw_user_meta_data->>'display_name', 
      new.raw_user_meta_data->>'full_name', 
      new.raw_user_meta_data->>'username'
    ),
    COALESCE(
      (new.raw_user_meta_data->>'sex')::sex_enum,
      'unspecified'::sex_enum
    ),
    COALESCE(new.raw_user_meta_data->>'locale', 'en')
  );
  RETURN new;
END;
$$;

-- Delete user account and all data
CREATE OR REPLACE FUNCTION delete_user_account(user_id_to_delete uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  -- Delete from auth.users will cascade to all other tables
  DELETE FROM auth.users WHERE id = user_id_to_delete;
END;
$$;

-- Delete a specific dream
CREATE OR REPLACE FUNCTION delete_dream(dream_id_param uuid, user_id_param uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  dream_exists boolean;
BEGIN
  -- Check if dream exists and belongs to user
  SELECT EXISTS(
    SELECT 1 FROM dreams 
    WHERE id = dream_id_param AND user_id = user_id_param
  ) INTO dream_exists;
  
  IF dream_exists THEN
    DELETE FROM dreams WHERE id = dream_id_param;
    RETURN true;
  ELSE
    RETURN false;
  END IF;
END;
$$;

-- Create embedding job when transcription completes
CREATE OR REPLACE FUNCTION create_embedding_job_on_transcription()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  -- When transcription completes, create an embedding job
  IF NEW.transcription_status = 'completed' AND 
     OLD.transcription_status != 'completed' AND
     NEW.raw_transcript IS NOT NULL AND 
     length(NEW.raw_transcript) > 0 THEN
    
    INSERT INTO embedding_jobs (dream_id, priority)
    VALUES (NEW.id, 0)
    ON CONFLICT (dream_id) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Search similar dreams by embedding
CREATE OR REPLACE FUNCTION search_similar_dreams(
  query_embedding vector(1024),
  user_id_filter uuid,
  similarity_threshold float DEFAULT 0.7,
  max_results int DEFAULT 10
)
RETURNS TABLE (
  dream_id uuid,
  title text,
  similarity float,
  created_at timestamptz
)
LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT ON (d.id)
    d.id as dream_id,
    d.title,
    1 - (de.embedding <=> query_embedding) as similarity,
    d.created_at
  FROM dream_embeddings de
  JOIN dreams d ON d.id = de.dream_id
  WHERE d.user_id = user_id_filter
    AND 1 - (de.embedding <=> query_embedding) > similarity_threshold
  ORDER BY d.id, de.embedding <=> query_embedding
  LIMIT max_results;
END;
$$;

-- Get themes for a dream
CREATE OR REPLACE FUNCTION get_dream_themes(dream_id_param uuid)
RETURNS TABLE (
  theme_code text,
  theme_label text,
  similarity float
)
LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  SELECT 
    dt.theme_code,
    t.label as theme_label,
    dt.similarity::float
  FROM dream_themes dt
  JOIN themes t ON t.code = dt.theme_code
  WHERE dt.dream_id = dream_id_param
  ORDER BY dt.similarity DESC;
END;
$$;

-- Search knowledge fragments
CREATE OR REPLACE FUNCTION search_fragments(
  query_embedding vector(1024),
  author_filter text,
  similarity_threshold float DEFAULT 0.7,
  max_results int DEFAULT 5
)
RETURNS TABLE (
  fragment_id uuid,
  text text,
  source text,
  chapter integer,
  author text,
  similarity float
)
LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  SELECT
    kf.id as fragment_id,
    kf.text,
    kf.source,
    kf.chapter,
    kf.author,
    1 - (kf.embedding <=> query_embedding) as similarity
  FROM knowledge_fragments kf
  WHERE kf.author = author_filter
    AND 1 - (kf.embedding <=> query_embedding) > similarity_threshold
  ORDER BY kf.embedding <=> query_embedding
  LIMIT max_results;
END;
$$;

-- Tag fragments with themes (batch processing)
CREATE OR REPLACE FUNCTION tag_fragment_batch(
  fragment_ids uuid[],
  similarity_threshold float DEFAULT 0.15
)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO fragment_themes (fragment_id, theme_code, similarity)
  SELECT 
    f.id as fragment_id,
    t.code as theme_code,
    1 - (f.embedding <=> t.embedding) as similarity
  FROM knowledge_fragments f
  CROSS JOIN themes t
  WHERE f.id = ANY(fragment_ids)
    AND f.embedding IS NOT NULL
    AND t.embedding IS NOT NULL
    AND 1 - (f.embedding <=> t.embedding) > similarity_threshold
  ON CONFLICT (fragment_id, theme_code) DO UPDATE
  SET similarity = EXCLUDED.similarity;
END;
$$;

-- Get top themes for a fragment
CREATE OR REPLACE FUNCTION get_fragment_themes(
  fragment_id_param uuid,
  limit_count integer DEFAULT 5
)
RETURNS TABLE (
  theme_code text,
  theme_label text,
  similarity float
)
LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ft.theme_code,
    t.label as theme_label,
    ft.similarity::float
  FROM fragment_themes ft
  JOIN themes t ON t.code = ft.theme_code
  WHERE ft.fragment_id = fragment_id_param
  ORDER BY ft.similarity DESC
  LIMIT limit_count;
END;
$$;

-- Cleanup stale embedding jobs
CREATE OR REPLACE FUNCTION cleanup_stale_embedding_jobs()
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  -- Mark jobs as failed if they've been processing for over 10 minutes
  UPDATE embedding_jobs
  SET 
    status = 'failed',
    error_message = 'Job timed out after 10 minutes',
    updated_at = now()
  WHERE status = 'processing'
    AND processing_started_at < now() - interval '10 minutes';
END;
$$;

-- =====================================================================
-- TRIGGERS
-- =====================================================================

-- Update timestamp triggers
CREATE TRIGGER trg_profiles_updated
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_dreams_updated
  BEFORE UPDATE ON dreams
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER update_interpretations_updated_at
  BEFORE UPDATE ON interpretations
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER update_elevenlabs_sessions_updated_at
  BEFORE UPDATE ON elevenlabs_sessions
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER update_embedding_jobs_updated_at
  BEFORE UPDATE ON embedding_jobs
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Handle user creation
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Create embedding job when transcription completes
CREATE TRIGGER trigger_create_embedding_job
  AFTER UPDATE OF transcription_status ON dreams
  FOR EACH ROW EXECUTE FUNCTION create_embedding_job_on_transcription();

-- =====================================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE dreams ENABLE ROW LEVEL SECURITY;
ALTER TABLE dream_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE themes ENABLE ROW LEVEL SECURITY;
ALTER TABLE dream_themes ENABLE ROW LEVEL SECURITY;
ALTER TABLE dream_embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE interpretations ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_base ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_fragments ENABLE ROW LEVEL SECURITY;
ALTER TABLE fragment_themes ENABLE ROW LEVEL SECURITY;
ALTER TABLE transcription_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE interpreters ENABLE ROW LEVEL SECURITY;
ALTER TABLE elevenlabs_sessions ENABLE ROW LEVEL SECURITY;

-- IMPORTANT: embedding_jobs table does NOT have RLS enabled
-- This is intentional as it's used for internal job processing
-- and needs to be accessible by backend workers

-- PROFILES policies
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role can manage profiles" ON profiles
  FOR ALL USING (auth.role() = 'service_role');

-- DREAMS policies
CREATE POLICY "Users can manage own dreams" ON dreams
  FOR ALL USING (user_id = auth.uid());

CREATE POLICY "Service role can manage dreams" ON dreams
  FOR ALL USING (auth.role() = 'service_role');

-- DREAM_IMAGES policies
CREATE POLICY "Users can manage images for own dreams" ON dream_images
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM dreams 
      WHERE dreams.id = dream_images.dream_id 
      AND dreams.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM dreams 
      WHERE dreams.id = dream_images.dream_id 
      AND dreams.user_id = auth.uid()
    )
  );

CREATE POLICY "Service role can manage dream_images" ON dream_images
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- THEMES policies (public read)
CREATE POLICY "Public can read themes" ON themes
  FOR SELECT TO anon, authenticated
  USING (true);

CREATE POLICY "Service role can manage themes" ON themes
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- DREAM_THEMES policies
CREATE POLICY "Users can view own dream themes" ON dream_themes
  FOR SELECT USING (
    dream_id IN (
      SELECT id FROM dreams WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Service role can manage dream_themes" ON dream_themes
  FOR ALL USING (auth.role() = 'service_role');

-- DREAM_EMBEDDINGS policies
CREATE POLICY "Users can view own dream embeddings" ON dream_embeddings
  FOR SELECT USING (
    dream_id IN (
      SELECT id FROM dreams WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Service role can manage dream_embeddings" ON dream_embeddings
  FOR ALL USING (auth.role() = 'service_role');

-- INTERPRETATIONS policies
CREATE POLICY "Users can view own interpretations" ON interpretations
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can insert own interpretations" ON interpretations
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Service role can manage interpretations" ON interpretations
  FOR ALL USING (auth.role() = 'service_role');

-- CONVERSATIONS policies
CREATE POLICY "Users can view own conversations" ON conversations
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own conversations" ON conversations
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own conversations" ON conversations
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage conversations" ON conversations
  FOR ALL USING (auth.role() = 'service_role');

-- MESSAGES policies
CREATE POLICY "Users can view messages from own conversations" ON messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM conversations 
      WHERE conversations.id = messages.conversation_id 
      AND conversations.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create messages in own conversations" ON messages
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM conversations 
      WHERE conversations.id = messages.conversation_id 
      AND conversations.user_id = auth.uid()
    )
  );

CREATE POLICY "Service role can manage messages" ON messages
  FOR ALL USING (auth.role() = 'service_role');

-- KNOWLEDGE_BASE policies (public read)
CREATE POLICY "Public can read knowledge base" ON knowledge_base
  FOR SELECT USING (true);

CREATE POLICY "Service role can manage knowledge_base" ON knowledge_base
  FOR ALL USING (auth.role() = 'service_role');

-- KNOWLEDGE_FRAGMENTS policies
CREATE POLICY "Authenticated users can read fragments" ON knowledge_fragments
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Service role can manage knowledge_fragments" ON knowledge_fragments
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- FRAGMENT_THEMES policies
CREATE POLICY "Authenticated users can read fragment themes" ON fragment_themes
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Service role can manage fragment_themes" ON fragment_themes
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- TRANSCRIPTION_USAGE policies
CREATE POLICY "Users can view own usage" ON transcription_usage
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Service role can manage transcription_usage" ON transcription_usage
  FOR ALL USING (auth.role() = 'service_role');

-- INTERPRETERS policies (public read)
CREATE POLICY "Public can read interpreters" ON interpreters
  FOR SELECT USING (true);

CREATE POLICY "Service role can manage interpreters" ON interpreters
  FOR ALL USING (auth.role() = 'service_role');

-- ELEVENLABS_SESSIONS policies
CREATE POLICY "Users can manage own sessions" ON elevenlabs_sessions
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage elevenlabs_sessions" ON elevenlabs_sessions
  FOR ALL USING (auth.role() = 'service_role');

-- =====================================================================
-- REALTIME SUBSCRIPTIONS
-- =====================================================================
ALTER PUBLICATION supabase_realtime ADD TABLE dreams;
ALTER PUBLICATION supabase_realtime ADD TABLE dream_images;
ALTER PUBLICATION supabase_realtime ADD TABLE conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE messages;

-- =====================================================================
-- STORAGE BUCKETS
-- =====================================================================
INSERT INTO storage.buckets (id, name, public) VALUES 
  ('avatars', 'avatars', true),
  ('interpreters', 'interpreters', true),
  ('dream-images', 'dream-images', true),
  ('audio-messages', 'audio-messages', false)
ON CONFLICT (id) DO NOTHING;

-- Avatar storage policies
DO $$ BEGIN
  CREATE POLICY "Users can upload own avatar" ON storage.objects
    FOR INSERT WITH CHECK (
      bucket_id = 'avatars' AND 
      auth.uid()::text = (storage.foldername(name))[1]
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Users can update own avatar" ON storage.objects
    FOR UPDATE WITH CHECK (
      bucket_id = 'avatars' AND 
      auth.uid()::text = (storage.foldername(name))[1]
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Users can delete own avatar" ON storage.objects
    FOR DELETE USING (
      bucket_id = 'avatars' AND 
      auth.uid()::text = (storage.foldername(name))[1]
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Public avatar access" ON storage.objects
    FOR SELECT USING (bucket_id = 'avatars');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Interpreter images policies
DO $$ BEGIN
  CREATE POLICY "Public interpreter images" ON storage.objects
    FOR SELECT USING (bucket_id = 'interpreters');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Dream images storage policies
DO $$ BEGIN
  CREATE POLICY "Users can upload own dream images" ON storage.objects
    FOR INSERT WITH CHECK (
      bucket_id = 'dream-images' AND 
      auth.uid()::text = (storage.foldername(name))[1]
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Users can view own dream images" ON storage.objects
    FOR SELECT USING (
      bucket_id = 'dream-images' AND 
      auth.uid()::text = (storage.foldername(name))[1]
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Service role can manage all dream images" ON storage.objects
    FOR ALL USING (
      bucket_id = 'dream-images' AND 
      auth.role() = 'service_role'
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Audio messages storage policies
DO $$ BEGIN
  CREATE POLICY "Users can upload own audio messages" ON storage.objects
    FOR INSERT WITH CHECK (
      bucket_id = 'audio-messages' AND 
      auth.uid()::text = (storage.foldername(name))[1]
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Users can access own audio messages" ON storage.objects
    FOR SELECT USING (
      bucket_id = 'audio-messages' AND 
      auth.uid()::text = (storage.foldername(name))[1]
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Service role can manage all audio messages" ON storage.objects
    FOR ALL USING (
      bucket_id = 'audio-messages' AND 
      auth.role() = 'service_role'
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- =====================================================================
-- COMMENTS FOR DOCUMENTATION
-- =====================================================================

COMMENT ON TABLE dreams IS 'Core dream entries with transcription and embedding tracking';
COMMENT ON COLUMN dreams.location_metadata IS 'JSON object containing city, country, countryCode, and method (manual or gps)';
COMMENT ON COLUMN dreams.embedding_status IS 'Status of BGE-M3 embedding generation process';

COMMENT ON TABLE dream_embeddings IS 'BGE-M3 vector embeddings for dream transcripts, chunked for long dreams';
COMMENT ON COLUMN dream_embeddings.chunk_index IS 'Index for handling long dreams split into multiple chunks';

COMMENT ON TABLE themes IS 'Dream theme definitions with BGE-M3 embeddings for similarity matching';
COMMENT ON COLUMN themes.sparse_embedding IS 'Sparse embedding for hybrid search (dense + sparse)';

COMMENT ON TABLE interpretations IS 'Dream interpretations by different interpreter types with version history';
COMMENT ON COLUMN interpretations.fragment_ids_used IS 'IDs of knowledge fragments used in generating this interpretation';

COMMENT ON TABLE knowledge_fragments IS 'Book/article content broken into fragments with BGE-M3 embeddings';
COMMENT ON TABLE fragment_themes IS 'Junction table linking knowledge fragments to relevant themes';

COMMENT ON TABLE embedding_jobs IS 'Async job queue for processing dream embeddings';
COMMENT ON TABLE elevenlabs_sessions IS 'Session management for ElevenLabs voice conversations';

-- =====================================================================
-- END OF INITIAL SCHEMA
-- =====================================================================