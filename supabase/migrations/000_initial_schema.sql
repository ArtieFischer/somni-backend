-- =====================================================================
-- COMPREHENSIVE INITIAL SCHEMA FOR SOMNI
-- =====================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS vector;

-- =====================================================================
-- ENUMS
-- =====================================================================

-- User demographics
CREATE TYPE sex_enum AS ENUM ('male', 'female', 'other', 'unspecified');

-- Transcription pipeline status
CREATE TYPE transcription_status_enum AS ENUM (
  'pending',           -- job queued, not started
  'processing',        -- Whisper/Deepgram running
  'done',              -- transcript available
  'error'              -- failed; details in transcription_metadata
);

-- Sleep phases
CREATE TYPE sleep_phase_enum AS ENUM ('unknown', 'n1', 'n2', 'n3', 'rem');

-- Location accuracy for heatmap features
CREATE TYPE loc_accuracy_enum AS ENUM ('none', 'country', 'region', 'city', 'exact');

-- =====================================================================
-- INTERPRETERS TABLE (must be created before profiles)
-- =====================================================================
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

-- =====================================================================
-- PROFILES TABLE (extended with location)
-- =====================================================================
CREATE TABLE profiles (
    user_id            uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
    handle             text        NOT NULL UNIQUE,
    username           text,
    sex                sex_enum    NOT NULL DEFAULT 'unspecified',
    birth_date         date,
    avatar_url         text,
    locale             varchar(10) NOT NULL DEFAULT 'en',
    dream_interpreter  text REFERENCES interpreters(id),
    is_premium         boolean     NOT NULL DEFAULT false,
    onboarding_complete boolean    NOT NULL DEFAULT false,
    
    -- Location data for heatmap features
    location           geography(Point,4326),  -- User's primary location
    location_accuracy  loc_accuracy_enum DEFAULT 'none',
    location_country   text,                   -- Fallback if no exact coords
    location_city      text,                   -- Fallback if no exact coords
    
    -- Settings JSON with location preferences
    settings           jsonb       NOT NULL DEFAULT '{
      "location_sharing": "none",
      "sleep_schedule": null,
      "improve_sleep_quality": null,
      "interested_in_lucid_dreaming": null
    }'::jsonb,
    
    created_at         timestamptz NOT NULL DEFAULT now(),
    updated_at         timestamptz NOT NULL DEFAULT now()
);

-- =====================================================================
-- DREAMS TABLE (core dream entries)
-- =====================================================================
CREATE TABLE dreams (
    -- Identity & ownership
    id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id              uuid NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,

    -- Timestamps
    created_at           timestamptz NOT NULL DEFAULT now(),
    updated_at           timestamptz NOT NULL DEFAULT now(),

    -- Content
    title                text,              -- LLM-generated short title
    raw_transcript       text,              -- original voice-to-text
    refined_narrative    text,              -- cleaned/enhanced story

    -- Sleep data
    sleep_phase          sleep_phase_enum   DEFAULT 'unknown',
    is_lucid             boolean            NOT NULL DEFAULT false,
    mood_before          smallint,          -- -5 to 5 scale
    mood_after           smallint,          -- -5 to 5 scale

    -- Location for heatmap
    location             geography(Point,4326),
    location_accuracy    loc_accuracy_enum  DEFAULT 'none',

    -- MiniLM embedding (384 dimensions)
    embedding            vector(384),

    -- Transcription job tracking
    transcription_status transcription_status_enum NOT NULL DEFAULT 'pending',
    transcription_metadata jsonb,
    transcription_job_id text,

    -- Image generation
    image_prompt         text,              -- Prompt used for image generation

    -- Constraints
    CONSTRAINT chk_mood_range CHECK (
        (mood_before IS NULL OR mood_before BETWEEN -5 AND 5) AND
        (mood_after IS NULL OR mood_after BETWEEN -5 AND 5)
    )
);

-- =====================================================================
-- DREAM IMAGES TABLE (multiple images per dream)
-- =====================================================================
CREATE TABLE dream_images (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    dream_id    uuid NOT NULL REFERENCES dreams(id) ON DELETE CASCADE,
    storage_path text NOT NULL,          -- Supabase Storage URL or bucket/key
    is_primary  boolean DEFAULT false,   -- Main image to display
    generated_at timestamptz NOT NULL DEFAULT now()
);

-- =====================================================================
-- THEMES TABLES (theme definitions and dream associations)
-- =====================================================================

-- Theme definitions with embeddings
CREATE TABLE themes (
    code  text PRIMARY KEY,              -- e.g., 'falling', 'flying'
    label text NOT NULL,                 -- Display name
    description text,                    -- Detailed description
    embedding vector(384),               -- MiniLM embedding for similarity
    created_at timestamptz DEFAULT now()
);

-- Many-to-many: which themes appear in which dreams
CREATE TABLE dream_themes (
    dream_id    uuid NOT NULL REFERENCES dreams(id) ON DELETE CASCADE,
    theme_code  text NOT NULL REFERENCES themes(code) ON DELETE RESTRICT,
    rank        smallint,                -- 1-10, order of relevance
    score       real,                    -- Cosine similarity or LLM score
    explanation text,                    -- Why this theme was detected
    PRIMARY KEY (dream_id, theme_code)
);

-- =====================================================================
-- INTERPRETATIONS TABLE
-- =====================================================================
CREATE TABLE interpretations (
    id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    dream_id         uuid NOT NULL REFERENCES dreams(id) ON DELETE CASCADE,
    interpreter_id   text NOT NULL REFERENCES interpreters(id),
    interpretation   text NOT NULL,       -- Main interpretation text
    key_symbols      jsonb,               -- Extracted symbols and meanings
    advice           text,                -- Actionable advice
    mood_analysis    jsonb,               -- Mood insights
    created_at       timestamptz NOT NULL DEFAULT now(),
    version          int DEFAULT 1
);

-- =====================================================================
-- CONVERSATIONS & MESSAGES (for future chat feature)
-- =====================================================================
CREATE TABLE conversations (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         uuid NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
    interpreter_id  text REFERENCES interpreters(id),
    dream_id        uuid REFERENCES dreams(id) ON DELETE SET NULL,
    started_at      timestamptz NOT NULL DEFAULT now(),
    last_message_at timestamptz
);

CREATE TABLE messages (
    id         bigserial PRIMARY KEY,
    conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    sender     text NOT NULL CHECK (sender IN ('user', 'interpreter', 'system')),
    content    text NOT NULL,
    embedding  vector(384),              -- For semantic search in conversations
    created_at timestamptz NOT NULL DEFAULT now()
);

-- =====================================================================
-- KNOWLEDGE BASE TABLE (RAG system for interpreters)
-- =====================================================================
CREATE TABLE knowledge_base (
  id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  interpreter_type text NOT NULL DEFAULT 'jung',
  source text NOT NULL,                  -- book/article name
  chapter text,                          -- chapter/section
  content text NOT NULL,                 -- text chunk
  content_type text NOT NULL,            -- 'theory', 'symbol', 'case_study', 'dream_example'
  metadata jsonb DEFAULT '{}',           -- flexible metadata
  embedding vector(384),                 -- MiniLM embeddings
  created_at timestamptz DEFAULT now(),
  
  CONSTRAINT valid_interpreter CHECK (
    interpreter_type IN ('jung', 'freud', 'mary', 'lakshmi', 'universal')
  )
);

-- =====================================================================
-- TRANSCRIPTION USAGE TABLE (billing/limits)
-- =====================================================================
CREATE TABLE transcription_usage (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  dream_id uuid NOT NULL REFERENCES dreams(id) ON DELETE CASCADE,
  duration_seconds integer NOT NULL,
  provider text DEFAULT 'whisper',       -- 'whisper', 'deepgram', etc.
  created_at timestamptz DEFAULT now() NOT NULL
);

-- =====================================================================
-- INDEXES
-- =====================================================================

-- Profiles
CREATE INDEX idx_profiles_locale ON profiles (locale);
CREATE INDEX idx_profiles_interpreter ON profiles (dream_interpreter);
CREATE INDEX idx_profiles_is_premium ON profiles (is_premium) WHERE is_premium = true;
CREATE INDEX idx_profiles_location ON profiles USING gist(location);

-- Dreams
CREATE INDEX idx_dreams_user_id ON dreams (user_id);
CREATE INDEX idx_dreams_created_at ON dreams (created_at DESC);
CREATE INDEX idx_dreams_location ON dreams USING gist(location);
CREATE INDEX idx_dreams_embedding ON dreams USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Dream images
CREATE INDEX idx_dream_images_dream ON dream_images(dream_id);

-- Themes
CREATE INDEX idx_dream_themes_code ON dream_themes(theme_code);
CREATE INDEX idx_themes_embedding ON themes USING ivfflat (embedding vector_cosine_ops) WITH (lists = 50);

-- Interpretations
CREATE INDEX idx_interpretations_dream ON interpretations(dream_id);

-- Conversations
CREATE INDEX idx_conversations_user ON conversations(user_id);
CREATE INDEX idx_messages_conversation ON messages(conversation_id);

-- Knowledge base
CREATE INDEX idx_kb_interpreter ON knowledge_base(interpreter_type);
CREATE INDEX idx_kb_content_type ON knowledge_base(content_type);
CREATE INDEX idx_kb_embedding ON knowledge_base USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Transcription usage
CREATE INDEX idx_transcription_usage_user_id ON transcription_usage(user_id);
CREATE INDEX idx_transcription_usage_created_at ON transcription_usage(created_at);

-- =====================================================================
-- FUNCTIONS
-- =====================================================================

-- Auto-update timestamp
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

-- Handle new user creation
CREATE OR REPLACE FUNCTION handle_new_user() 
RETURNS trigger AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Search themes by embedding similarity
CREATE OR REPLACE FUNCTION search_themes(
  query_embedding vector(384),
  similarity_threshold float DEFAULT 0.15,
  max_results int DEFAULT 10
)
RETURNS TABLE (
  code text,
  label text,
  score float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    t.code,
    t.label,
    1 - (t.embedding <=> query_embedding) as score
  FROM themes t
  WHERE 1 - (t.embedding <=> query_embedding) > similarity_threshold
  ORDER BY t.embedding <=> query_embedding
  LIMIT max_results;
END;
$$;

-- Search knowledge base
CREATE OR REPLACE FUNCTION search_knowledge(
  query_embedding vector(384),
  target_interpreter text DEFAULT 'jung',
  similarity_threshold float DEFAULT 0.7,
  max_results int DEFAULT 5
)
RETURNS TABLE (
  id bigint,
  content text,
  source text,
  chapter text,
  content_type text,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    kb.id,
    kb.content,
    kb.source,
    kb.chapter,
    kb.content_type,
    1 - (kb.embedding <=> query_embedding) as similarity
  FROM knowledge_base kb
  WHERE
    kb.interpreter_type = target_interpreter
    AND 1 - (kb.embedding <=> query_embedding) > similarity_threshold
  ORDER BY kb.embedding <=> query_embedding
  LIMIT max_results;
END;
$$;

-- =====================================================================
-- TRIGGERS
-- =====================================================================

-- Update timestamps
CREATE TRIGGER trg_profiles_updated
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_dreams_updated
  BEFORE UPDATE ON dreams
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Handle user creation
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- =====================================================================
-- ROW LEVEL SECURITY
-- =====================================================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE dreams ENABLE ROW LEVEL SECURITY;
ALTER TABLE dream_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE themes ENABLE ROW LEVEL SECURITY;
ALTER TABLE dream_themes ENABLE ROW LEVEL SECURITY;
ALTER TABLE interpretations ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_base ENABLE ROW LEVEL SECURITY;
ALTER TABLE transcription_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE interpreters ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY profiles_self_select ON profiles
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY profiles_self_update ON profiles
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY profiles_service_role_all ON profiles
  FOR ALL USING (auth.role() = 'service_role');

-- Dreams policies
CREATE POLICY dreams_self_all ON dreams
  FOR ALL USING (user_id = auth.uid());

CREATE POLICY dreams_service_role_all ON dreams
  FOR ALL USING (auth.role() = 'service_role');

-- Dream images policies
CREATE POLICY dream_images_owner_all ON dream_images
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM dreams 
      WHERE dreams.id = dream_images.dream_id 
      AND dreams.user_id = auth.uid()
    )
  );

CREATE POLICY dream_images_service_role_all ON dream_images
  FOR ALL USING (auth.role() = 'service_role');

-- Themes policies (public read)
CREATE POLICY themes_public_read ON themes
  FOR SELECT USING (true);

CREATE POLICY themes_service_role_all ON themes
  FOR ALL USING (auth.role() = 'service_role');

-- Dream themes policies
CREATE POLICY dream_themes_owner_all ON dream_themes
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM dreams 
      WHERE dreams.id = dream_themes.dream_id 
      AND dreams.user_id = auth.uid()
    )
  );

CREATE POLICY dream_themes_service_role_all ON dream_themes
  FOR ALL USING (auth.role() = 'service_role');

-- Interpretations policies
CREATE POLICY interpretations_owner_all ON interpretations
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM dreams 
      WHERE dreams.id = interpretations.dream_id 
      AND dreams.user_id = auth.uid()
    )
  );

CREATE POLICY interpretations_service_role_all ON interpretations
  FOR ALL USING (auth.role() = 'service_role');

-- Conversations policies
CREATE POLICY conversations_self_all ON conversations
  FOR ALL USING (user_id = auth.uid());

CREATE POLICY conversations_service_role_all ON conversations
  FOR ALL USING (auth.role() = 'service_role');

-- Messages policies
CREATE POLICY messages_owner_all ON messages
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM conversations 
      WHERE conversations.id = messages.conversation_id 
      AND conversations.user_id = auth.uid()
    )
  );

CREATE POLICY messages_service_role_all ON messages
  FOR ALL USING (auth.role() = 'service_role');

-- Knowledge base policies (public read)
CREATE POLICY knowledge_base_public_read ON knowledge_base
  FOR SELECT USING (true);

CREATE POLICY knowledge_base_service_role_all ON knowledge_base
  FOR ALL USING (auth.role() = 'service_role');

-- Transcription usage policies
CREATE POLICY transcription_usage_self_read ON transcription_usage
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY transcription_usage_service_role_all ON transcription_usage
  FOR ALL USING (auth.role() = 'service_role');

-- Interpreters policies (public read)
CREATE POLICY interpreters_public_read ON interpreters
  FOR SELECT USING (true);

-- =====================================================================
-- REALTIME (enable for dreams and dream_images)
-- =====================================================================
ALTER PUBLICATION supabase_realtime ADD TABLE dreams;
ALTER PUBLICATION supabase_realtime ADD TABLE dream_images;

-- =====================================================================
-- STORAGE BUCKETS
-- =====================================================================
INSERT INTO storage.buckets (id, name, public) VALUES 
  ('avatars', 'avatars', true),
  ('interpreters', 'interpreters', true),
  ('dream-images', 'dream-images', true)
ON CONFLICT (id) DO NOTHING;

-- Avatar storage policies (IF NOT EXISTS)
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