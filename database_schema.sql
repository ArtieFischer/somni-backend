-- SOMNI DATABASE SCHEMA
-- Complete database schema including tables, indexes, functions, triggers, enums, and types

-- =====================================================
-- ENUMS AND CUSTOM TYPES
-- =====================================================

-- Conversation status enum
CREATE TYPE conversation_status_enum AS ENUM ('active', 'ended', 'error');

-- Location accuracy enum
CREATE TYPE loc_accuracy_enum AS ENUM ('none', 'manual', 'exact');

-- Sex enum
CREATE TYPE sex_enum AS ENUM ('male', 'female', 'other', 'unspecified');

-- Sleep phase enum
CREATE TYPE sleep_phase_enum AS ENUM ('unknown', 'n1', 'n2', 'n3', 'rem');

-- Transcription status enum
CREATE TYPE transcription_status_enum AS ENUM ('pending', 'processing', 'done', 'error', 'completed', 'failed');

-- =====================================================
-- TABLES
-- =====================================================

-- PROFILES TABLE
CREATE TABLE profiles (
    user_id uuid NOT NULL,
    handle text NOT NULL,
    username text,
    sex sex_enum NOT NULL DEFAULT 'unspecified'::sex_enum,
    birth_date date,
    avatar_url text,
    locale character varying(10) NOT NULL DEFAULT 'en'::character varying,
    dream_interpreter text,
    is_premium boolean NOT NULL DEFAULT false,
    onboarding_complete boolean NOT NULL DEFAULT false,
    location geography(Point,4326),
    location_country text,
    location_city text,
    settings jsonb NOT NULL DEFAULT '{"sleep_schedule": null, "location_sharing": "none", "improve_sleep_quality": null, "interested_in_lucid_dreaming": null}'::jsonb,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    location_accuracy loc_accuracy_enum NOT NULL DEFAULT 'none'::loc_accuracy_enum,
    push_token text,
    push_token_platform text,
    push_token_updated_at timestamp with time zone,
    notification_preferences jsonb DEFAULT '{"reminders": true, "achievements": true, "interpretations": true}'::jsonb,
    CONSTRAINT profiles_pkey PRIMARY KEY (user_id),
    CONSTRAINT profiles_handle_key UNIQUE (handle),
    CONSTRAINT profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
    CONSTRAINT profiles_dream_interpreter_fkey FOREIGN KEY (dream_interpreter) REFERENCES interpreters(id),
    CONSTRAINT profiles_push_token_platform_check CHECK ((push_token_platform = ANY (ARRAY['ios'::text, 'android'::text])))
);

-- DREAMS TABLE
CREATE TABLE dreams (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    title text,
    raw_transcript text,
    is_lucid boolean NOT NULL DEFAULT false,
    transcription_status transcription_status_enum NOT NULL DEFAULT 'pending'::transcription_status_enum,
    transcription_metadata jsonb,
    transcription_job_id text,
    image_prompt text,
    mood smallint,
    clarity smallint,
    location_metadata jsonb,
    embedding_status text DEFAULT 'pending'::text,
    embedding_error text,
    embedding_attempts integer DEFAULT 0,
    embedding_processed_at timestamp with time zone,
    embedding_started_at timestamp with time zone,
    CONSTRAINT dreams_pkey PRIMARY KEY (id),
    CONSTRAINT dreams_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
    CONSTRAINT dreams_clarity_check CHECK (((clarity >= 1) AND (clarity <= 100))),
    CONSTRAINT dreams_embedding_attempts_check CHECK (((embedding_attempts >= 0) AND (embedding_attempts <= 3))),
    CONSTRAINT dreams_embedding_status_check CHECK ((embedding_status = ANY (ARRAY['pending'::text, 'processing'::text, 'completed'::text, 'failed'::text, 'skipped'::text]))),
    CONSTRAINT dreams_mood_check CHECK (((mood >= 1) AND (mood <= 5)))
);

-- DREAM_IMAGES TABLE
CREATE TABLE dream_images (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    dream_id uuid NOT NULL,
    storage_path text NOT NULL,
    is_primary boolean DEFAULT false,
    generated_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT dream_images_pkey PRIMARY KEY (id),
    CONSTRAINT dream_images_dream_id_fkey FOREIGN KEY (dream_id) REFERENCES dreams(id) ON DELETE CASCADE
);

-- DREAM_EMBEDDINGS TABLE
CREATE TABLE dream_embeddings (
    id bigint NOT NULL DEFAULT nextval('dream_embeddings_id_seq'::regclass),
    dream_id uuid NOT NULL,
    embedding vector(1024) NOT NULL,
    chunk_index integer NOT NULL DEFAULT 0,
    chunk_text text NOT NULL,
    token_count integer NOT NULL,
    embedding_version text NOT NULL DEFAULT 'bge-m3-v1'::text,
    processing_time_ms integer,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT dream_embeddings_pkey PRIMARY KEY (id),
    CONSTRAINT dream_embeddings_dream_id_chunk_index_embedding_version_key UNIQUE (dream_id, chunk_index, embedding_version),
    CONSTRAINT dream_embeddings_dream_id_fkey FOREIGN KEY (dream_id) REFERENCES dreams(id) ON DELETE CASCADE,
    CONSTRAINT dream_embeddings_token_count_check CHECK ((token_count > 0))
);

-- THEMES TABLE
CREATE TABLE themes (
    code text NOT NULL,
    label text NOT NULL,
    description text,
    created_at timestamp with time zone DEFAULT now(),
    sparse_embedding jsonb,
    embedding_version text DEFAULT 'bge-m3'::text,
    metadata jsonb DEFAULT '{}'::jsonb,
    embedding vector(1024),
    CONSTRAINT themes_pkey PRIMARY KEY (code)
);

-- DREAM_THEMES TABLE
CREATE TABLE dream_themes (
    dream_id uuid NOT NULL,
    theme_code text NOT NULL,
    rank smallint,
    score real,
    explanation text,
    similarity double precision,
    chunk_index integer,
    extracted_at timestamp with time zone DEFAULT now(),
    CONSTRAINT dream_themes_pkey PRIMARY KEY (dream_id, theme_code),
    CONSTRAINT dream_themes_dream_id_theme_code_key UNIQUE (dream_id, theme_code),
    CONSTRAINT dream_themes_dream_id_fkey FOREIGN KEY (dream_id) REFERENCES dreams(id) ON DELETE CASCADE,
    CONSTRAINT dream_themes_theme_code_fkey FOREIGN KEY (theme_code) REFERENCES themes(code),
    CONSTRAINT dream_themes_similarity_check CHECK (((similarity >= (0)::double precision) AND (similarity <= (1)::double precision)))
);

-- INTERPRETERS TABLE
CREATE TABLE interpreters (
    id text NOT NULL,
    name text NOT NULL,
    full_name text NOT NULL,
    description text NOT NULL,
    image_url text NOT NULL,
    interpretation_style jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT interpreters_pkey PRIMARY KEY (id)
);

-- INTERPRETATIONS TABLE
CREATE TABLE interpretations (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    dream_id uuid NOT NULL,
    user_id uuid NOT NULL,
    interpreter_type text NOT NULL,
    interpretation_summary text NOT NULL,
    full_response jsonb NOT NULL,
    dream_topic text NOT NULL,
    quick_take text NOT NULL,
    symbols text[] DEFAULT '{}'::text[],
    emotional_tone jsonb,
    primary_insight text,
    key_pattern text,
    knowledge_fragments_used integer DEFAULT 0,
    total_fragments_retrieved integer DEFAULT 0,
    fragment_ids_used text[] DEFAULT '{}'::text[],
    processing_time_ms integer,
    model_used text DEFAULT 'gpt-4o'::text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    version integer DEFAULT 1,
    previous_version_id uuid,
    CONSTRAINT interpretations_pkey PRIMARY KEY (id),
    CONSTRAINT unique_dream_interpreter_version UNIQUE (dream_id, interpreter_type, version),
    CONSTRAINT interpretations_dream_id_fkey FOREIGN KEY (dream_id) REFERENCES dreams(id) ON DELETE CASCADE,
    CONSTRAINT interpretations_interpreter_type_fkey FOREIGN KEY (interpreter_type) REFERENCES interpreters(id),
    CONSTRAINT interpretations_previous_version_id_fkey FOREIGN KEY (previous_version_id) REFERENCES interpretations(id),
    CONSTRAINT interpretations_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(user_id) ON DELETE CASCADE
);

-- CONVERSATIONS TABLE
CREATE TABLE conversations (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    interpreter_id text,
    dream_id uuid,
    started_at timestamp with time zone NOT NULL DEFAULT now(),
    last_message_at timestamp with time zone,
    status conversation_status_enum NOT NULL DEFAULT 'active'::conversation_status_enum,
    ended_at timestamp with time zone,
    elevenlabs_session_id text,
    resumed_at timestamp with time zone,
    elevenlabs_agent_id character varying(255),
    implementation_type character varying(50) DEFAULT 'websocket'::character varying,
    CONSTRAINT conversations_pkey PRIMARY KEY (id),
    CONSTRAINT conversations_dream_id_fkey FOREIGN KEY (dream_id) REFERENCES dreams(id) ON DELETE SET NULL,
    CONSTRAINT conversations_interpreter_id_fkey FOREIGN KEY (interpreter_id) REFERENCES interpreters(id),
    CONSTRAINT conversations_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(user_id) ON DELETE CASCADE,
    CONSTRAINT chk_implementation_type CHECK (((implementation_type)::text = ANY ((ARRAY['websocket'::character varying, 'elevenlabs'::character varying])::text[])))
);

-- MESSAGES TABLE
CREATE TABLE messages (
    id bigint NOT NULL DEFAULT nextval('messages_id_seq'::regclass),
    conversation_id uuid NOT NULL,
    sender text NOT NULL,
    content text NOT NULL,
    embedding vector(1536),
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    role text NOT NULL,
    audio_url text,
    elevenlabs_metadata jsonb,
    CONSTRAINT messages_pkey PRIMARY KEY (id),
    CONSTRAINT messages_conversation_id_fkey FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
    CONSTRAINT chk_role CHECK ((role = ANY (ARRAY['user'::text, 'assistant'::text]))),
    CONSTRAINT messages_sender_check CHECK ((sender = ANY (ARRAY['user'::text, 'interpreter'::text, 'system'::text])))
);

-- KNOWLEDGE_BASE TABLE
CREATE TABLE knowledge_base (
    id bigint NOT NULL,
    interpreter_type text NOT NULL DEFAULT 'jung'::text,
    source text NOT NULL,
    chapter text,
    content text NOT NULL,
    content_type text NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb,
    embedding vector(1536),
    created_at timestamp with time zone DEFAULT now(),
    embedding_bge vector(1024),
    sparse_embedding jsonb,
    metadata_v2 jsonb,
    embedding_version text DEFAULT 'minilm-v1'::text,
    CONSTRAINT knowledge_base_pkey PRIMARY KEY (id),
    CONSTRAINT valid_interpreter CHECK ((interpreter_type = ANY (ARRAY['jung'::text, 'freud'::text, 'mary'::text, 'lakshmi'::text, 'universal'::text])))
);

-- KNOWLEDGE_FRAGMENTS TABLE
CREATE TABLE knowledge_fragments (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    source text NOT NULL,
    interpreter text NOT NULL,
    chapter integer,
    text text NOT NULL,
    embedding vector(1024),
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT knowledge_fragments_pkey PRIMARY KEY (id)
);

-- FRAGMENT_THEMES TABLE
CREATE TABLE fragment_themes (
    fragment_id uuid NOT NULL,
    theme_code text NOT NULL,
    similarity real NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT fragment_themes_pkey PRIMARY KEY (fragment_id, theme_code),
    CONSTRAINT fragment_themes_fragment_id_fkey FOREIGN KEY (fragment_id) REFERENCES knowledge_fragments(id) ON DELETE CASCADE,
    CONSTRAINT fragment_themes_theme_code_fkey FOREIGN KEY (theme_code) REFERENCES themes(code) ON DELETE CASCADE
);

-- TRANSCRIPTION_USAGE TABLE
CREATE TABLE transcription_usage (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    dream_id uuid NOT NULL,
    duration_seconds integer NOT NULL,
    provider text DEFAULT 'whisper'::text,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    language_code text,
    character_count integer,
    CONSTRAINT transcription_usage_pkey PRIMARY KEY (id),
    CONSTRAINT transcription_usage_dream_id_fkey FOREIGN KEY (dream_id) REFERENCES dreams(id) ON DELETE CASCADE,
    CONSTRAINT transcription_usage_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(user_id) ON DELETE CASCADE
);

-- EMBEDDING_JOBS TABLE
CREATE TABLE embedding_jobs (
    id bigint NOT NULL DEFAULT nextval('embedding_jobs_id_seq'::regclass),
    dream_id uuid NOT NULL,
    status text NOT NULL DEFAULT 'pending'::text,
    priority integer DEFAULT 0,
    attempts integer DEFAULT 0,
    max_attempts integer DEFAULT 3,
    error_message text,
    scheduled_at timestamp with time zone DEFAULT now(),
    started_at timestamp with time zone,
    completed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT embedding_jobs_pkey PRIMARY KEY (id),
    CONSTRAINT embedding_jobs_dream_id_key UNIQUE (dream_id),
    CONSTRAINT embedding_jobs_dream_id_fkey FOREIGN KEY (dream_id) REFERENCES dreams(id) ON DELETE CASCADE,
    CONSTRAINT embedding_jobs_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'processing'::text, 'completed'::text, 'failed'::text])))
);

-- ELEVENLABS_SESSIONS TABLE
CREATE TABLE elevenlabs_sessions (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    conversation_id uuid NOT NULL,
    agent_id character varying(255) NOT NULL,
    session_token text NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT elevenlabs_sessions_pkey PRIMARY KEY (id),
    CONSTRAINT elevenlabs_sessions_conversation_id_fkey FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
    CONSTRAINT elevenlabs_sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- =====================================================
-- INDEXES
-- =====================================================

-- Conversations indexes
CREATE INDEX idx_conversations_ended_at ON conversations USING btree (ended_at);
CREATE INDEX idx_conversations_status ON conversations USING btree (status);
CREATE INDEX idx_conversations_user ON conversations USING btree (user_id);
CREATE INDEX idx_conversations_user_dream_interpreter ON conversations USING btree (user_id, dream_id, interpreter_id);

-- Dream embeddings indexes
CREATE INDEX idx_dream_embeddings_dream_id ON dream_embeddings USING btree (dream_id);
CREATE INDEX idx_dream_embeddings_vector ON dream_embeddings USING ivfflat (embedding vector_cosine_ops) WITH (lists='100');
CREATE INDEX idx_dream_embeddings_version ON dream_embeddings USING btree (embedding_version);

-- Dream images indexes
CREATE INDEX idx_dream_images_dream ON dream_images USING btree (dream_id);

-- Dream themes indexes
CREATE INDEX idx_dream_themes_code ON dream_themes USING btree (theme_code);
CREATE INDEX idx_dream_themes_dream_id ON dream_themes USING btree (dream_id);
CREATE INDEX idx_dream_themes_similarity ON dream_themes USING btree (similarity DESC);
CREATE INDEX idx_dream_themes_theme_code ON dream_themes USING btree (theme_code);

-- Dreams indexes
CREATE UNIQUE INDEX idx_dream_embedding_processing ON dreams USING btree (id) WHERE (embedding_status = 'processing'::text);
CREATE INDEX idx_dreams_clarity ON dreams USING btree (clarity);
CREATE INDEX idx_dreams_country ON dreams USING btree (((location_metadata ->> 'country'::text)));
CREATE INDEX idx_dreams_created_at ON dreams USING btree (created_at DESC);
CREATE INDEX idx_dreams_embedding_status ON dreams USING btree (embedding_status) WHERE (embedding_status = ANY (ARRAY['pending'::text, 'failed'::text]));
CREATE INDEX idx_dreams_location_metadata ON dreams USING gin (location_metadata);
CREATE INDEX idx_dreams_mood ON dreams USING btree (mood);
CREATE INDEX idx_dreams_user_id ON dreams USING btree (user_id);

-- ElevenLabs sessions indexes
CREATE INDEX idx_elevenlabs_sessions_conversation_id ON elevenlabs_sessions USING btree (conversation_id);
CREATE INDEX idx_elevenlabs_sessions_expires_at ON elevenlabs_sessions USING btree (expires_at);
CREATE INDEX idx_elevenlabs_sessions_user_id ON elevenlabs_sessions USING btree (user_id);

-- Embedding jobs indexes
CREATE INDEX idx_embedding_jobs_dream_id ON embedding_jobs USING btree (dream_id);
CREATE INDEX idx_embedding_jobs_status_priority ON embedding_jobs USING btree (status, priority DESC, scheduled_at) WHERE (status = ANY (ARRAY['pending'::text, 'failed'::text]));

-- Fragment themes indexes
CREATE INDEX idx_fragment_themes_fragment ON fragment_themes USING btree (fragment_id);
CREATE INDEX idx_fragment_themes_theme ON fragment_themes USING btree (theme_code);

-- Interpretations indexes
CREATE INDEX idx_interpretations_created_at ON interpretations USING btree (created_at DESC);
CREATE INDEX idx_interpretations_dream_id ON interpretations USING btree (dream_id);
CREATE INDEX idx_interpretations_dream_interpreter ON interpretations USING btree (dream_id, interpreter_type);
CREATE INDEX idx_interpretations_fragment_ids ON interpretations USING gin (fragment_ids_used);
CREATE INDEX idx_interpretations_interpreter_type ON interpretations USING btree (interpreter_type);
CREATE INDEX idx_interpretations_search ON interpretations USING gin (to_tsvector('english'::regconfig, ((((COALESCE(interpretation_summary, ''::text) || ' '::text) || COALESCE(primary_insight, ''::text)) || ' '::text) || COALESCE(dream_topic, ''::text))));
CREATE INDEX idx_interpretations_symbols ON interpretations USING gin (symbols);
CREATE INDEX idx_interpretations_user_id ON interpretations USING btree (user_id);

-- Knowledge base indexes
CREATE INDEX idx_kb_content_type ON knowledge_base USING btree (content_type);
CREATE INDEX idx_kb_embedding ON knowledge_base USING ivfflat (embedding vector_cosine_ops) WITH (lists='100');
CREATE INDEX idx_kb_interpreter ON knowledge_base USING btree (interpreter_type);
CREATE INDEX idx_knowledge_bge_hnsw ON knowledge_base USING hnsw (embedding_bge vector_cosine_ops) WITH (m='16', ef_construction='64');
CREATE INDEX idx_knowledge_concepts ON knowledge_base USING btree (((metadata_v2 ->> 'jungian_concepts'::text)));
CREATE INDEX idx_knowledge_concepts_v2 ON knowledge_base USING btree (((metadata_v2 ->> 'jungian_concepts'::text)));
CREATE INDEX idx_knowledge_sparse_gin ON knowledge_base USING gin (sparse_embedding);
CREATE INDEX idx_knowledge_themes ON knowledge_base USING btree (((metadata_v2 ->> 'applicable_themes'::text)));
CREATE INDEX idx_knowledge_themes_v2 ON knowledge_base USING btree (((metadata_v2 ->> 'applicable_themes'::text)));

-- Knowledge fragments indexes
CREATE INDEX idx_fragments_author ON knowledge_fragments USING btree (interpreter);
CREATE INDEX idx_fragments_embedding_hnsw ON knowledge_fragments USING hnsw (embedding vector_cosine_ops) WITH (m='16', ef_construction='64');
CREATE INDEX idx_fragments_source ON knowledge_fragments USING btree (source);
CREATE INDEX idx_knowledge_fragments_interpreter ON knowledge_fragments USING btree (interpreter);

-- Messages indexes
CREATE INDEX idx_messages_conversation ON messages USING btree (conversation_id);
CREATE INDEX idx_messages_role ON messages USING btree (role);

-- Profiles indexes
CREATE INDEX idx_profiles_interpreter ON profiles USING btree (dream_interpreter);
CREATE INDEX idx_profiles_is_premium ON profiles USING btree (is_premium) WHERE (is_premium = true);
CREATE INDEX idx_profiles_locale ON profiles USING btree (locale);
CREATE INDEX idx_profiles_location ON profiles USING gist (location);
CREATE INDEX idx_profiles_push_token ON profiles USING btree (push_token) WHERE (push_token IS NOT NULL);

-- Themes indexes
CREATE INDEX idx_themes_embedding_hnsw ON themes USING hnsw (embedding vector_cosine_ops) WITH (m='16', ef_construction='64');

-- Transcription usage indexes
CREATE INDEX idx_transcription_usage_created_at ON transcription_usage USING btree (created_at);
CREATE INDEX idx_transcription_usage_dream_id ON transcription_usage USING btree (dream_id);
CREATE INDEX idx_transcription_usage_language ON transcription_usage USING btree (language_code);
CREATE INDEX idx_transcription_usage_user_id ON transcription_usage USING btree (user_id);

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Dreams triggers
CREATE TRIGGER trg_dreams_updated 
    BEFORE UPDATE ON dreams 
    FOR EACH ROW 
    EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trigger_create_embedding_job 
    AFTER UPDATE OF transcription_status ON dreams 
    FOR EACH ROW 
    EXECUTE FUNCTION create_embedding_job_on_transcription();

-- ElevenLabs sessions trigger
CREATE TRIGGER update_elevenlabs_sessions_updated_at 
    BEFORE UPDATE ON elevenlabs_sessions 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Interpretations trigger
CREATE TRIGGER update_interpretations_updated_at 
    BEFORE UPDATE ON interpretations 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Profiles trigger
CREATE TRIGGER trg_profiles_updated 
    BEFORE UPDATE ON profiles 
    FOR EACH ROW 
    EXECUTE FUNCTION set_updated_at();

-- =====================================================
-- FUNCTIONS
-- =====================================================

-- Set updated_at timestamp
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$function$;

-- Update updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$;

-- Handle new user creation
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  default_handle text;
BEGIN
  -- Check if profile already exists
  IF EXISTS (SELECT 1 FROM profiles WHERE user_id = new.id) THEN
    RETURN new;
  END IF;

  -- Generate a unique handle if not provided
  default_handle := COALESCE(
    new.raw_user_meta_data->>'handle', 
    new.raw_user_meta_data->>'username', 
    'user_' || substring(new.id::text, 1, 8)
  );
  
  -- Ensure handle is unique by adding a suffix if needed
  WHILE EXISTS (SELECT 1 FROM profiles WHERE handle = default_handle) LOOP
    default_handle := default_handle || '_' || substring(md5(random()::text), 1, 4);
  END LOOP;

  INSERT INTO public.profiles (
    user_id, 
    handle,
    username,
    sex,
    locale,
    is_premium,
    onboarding_complete,
    location_accuracy,
    settings,
    created_at,
    updated_at
  )
  VALUES (
    new.id,
    default_handle,
    COALESCE(
      new.raw_user_meta_data->>'display_name', 
      new.raw_user_meta_data->>'full_name', 
      new.raw_user_meta_data->>'username'
    ),
    COALESCE(
      (new.raw_user_meta_data->>'sex')::sex_enum,
      'unspecified'::sex_enum
    ),
    COALESCE(new.raw_user_meta_data->>'locale', 'en'),
    false,
    false,
    'none'::loc_accuracy_enum,
    '{
      "location_sharing": "none",
      "sleep_schedule": null,
      "improve_sleep_quality": null,
      "interested_in_lucid_dreaming": null
    }'::jsonb,
    now(),
    now()
  );
  
  RETURN new;
EXCEPTION
  WHEN unique_violation THEN
    -- If there's still a unique violation, log it and continue
    RAISE LOG 'handle_new_user: unique violation for user %', new.id;
    RETURN new;
  WHEN OTHERS THEN
    -- Log other errors but don't fail the auth signup
    RAISE LOG 'handle_new_user error: % %', SQLERRM, SQLSTATE;
    RETURN new;
END;
$function$;

-- Create embedding job on transcription completion
CREATE OR REPLACE FUNCTION create_embedding_job_on_transcription()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  -- Only create job if transcription completed successfully
  IF NEW.transcription_status = 'completed' AND 
     OLD.transcription_status != 'completed' AND
     NEW.raw_transcript IS NOT NULL AND
     length(NEW.raw_transcript) >= 50 THEN
    
    -- Check if job already exists
    INSERT INTO embedding_jobs (dream_id, priority)
    VALUES (NEW.id, 0)
    ON CONFLICT (dream_id) DO NOTHING;
    
    -- Update dream embedding status
    UPDATE dreams 
    SET embedding_status = 'pending'
    WHERE id = NEW.id AND embedding_status IS NULL;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Delete dream
CREATE OR REPLACE FUNCTION delete_dream(dream_id_param uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  dream_owner uuid;
BEGIN
  -- Check if the dream belongs to the current user
  SELECT user_id INTO dream_owner
  FROM dreams
  WHERE id = dream_id_param;
  
  IF dream_owner IS NULL THEN
    RAISE EXCEPTION 'Dream not found';
  END IF;
  
  IF dream_owner != auth.uid() THEN
    RAISE EXCEPTION 'Unauthorized: You can only delete your own dreams';
  END IF;
  
  -- Delete the dream (will cascade to related tables)
  DELETE FROM dreams WHERE id = dream_id_param;
  
  RETURN true;
END;
$function$;

-- Delete all user dreams
CREATE OR REPLACE FUNCTION delete_all_user_dreams()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  deleted_count integer;
BEGIN
  -- Delete all dreams for the current user
  DELETE FROM dreams 
  WHERE user_id = auth.uid();
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  RETURN deleted_count;
END;
$function$;

-- Delete user account
CREATE OR REPLACE FUNCTION delete_user_account()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  user_id_to_delete uuid;
BEGIN
  -- Get the current user's ID
  user_id_to_delete := auth.uid();
  
  -- Check if user is authenticated
  IF user_id_to_delete IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  -- Log the deletion attempt
  RAISE LOG 'User % is deleting their account', user_id_to_delete;
  
  -- Delete from auth.users (this will cascade to profiles and all related data)
  DELETE FROM auth.users WHERE id = user_id_to_delete;
  
  -- If we get here, the deletion was successful
  RAISE LOG 'Successfully deleted user account %', user_id_to_delete;
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Failed to delete account: %', SQLERRM;
END;
$function$;

-- Get dream themes
CREATE OR REPLACE FUNCTION get_dream_themes(p_dream_id uuid, p_min_similarity double precision DEFAULT 0.5)
RETURNS TABLE(theme_code text, theme_label text, theme_description text, similarity double precision, explanation text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  BEGIN
    RETURN QUERY
    SELECT
      dt.theme_code,
      t.label as theme_label,
      t.description as theme_description,
      COALESCE(dt.similarity, dt.score::FLOAT) as similarity,
      dt.explanation
    FROM dream_themes dt
    JOIN themes t ON t.code = dt.theme_code
    WHERE
      dt.dream_id = p_dream_id
      AND COALESCE(dt.similarity, dt.score::FLOAT) >=
  p_min_similarity
    ORDER BY COALESCE(dt.similarity, dt.score::FLOAT) DESC;
  END;
  $function$;

-- Get user push token
CREATE OR REPLACE FUNCTION get_user_push_token(p_user_id uuid)
RETURNS TABLE(push_token text, platform text, preferences jsonb)
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
  BEGIN
    RETURN QUERY
    SELECT
      p.push_token,
      p.push_token_platform,
      p.notification_preferences
    FROM public.profiles p
    WHERE p.user_id = p_user_id
      AND p.push_token IS NOT NULL;
  END;
  $function$;

-- Search similar dreams
CREATE OR REPLACE FUNCTION search_similar_dreams(query_embedding vector, user_id_filter uuid DEFAULT NULL::uuid, similarity_threshold double precision DEFAULT 0.7, max_results integer DEFAULT 10)
RETURNS TABLE(dream_id uuid, similarity double precision, chunk_text text, chunk_index integer, dream_title text, created_at timestamp with time zone)
LANGUAGE plpgsql
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    de.dream_id,
    1 - (de.embedding <=> query_embedding) as similarity,
    de.chunk_text,
    de.chunk_index,
    d.title as dream_title,
    d.created_at
  FROM dream_embeddings de
  JOIN dreams d ON d.id = de.dream_id
  WHERE 
    (user_id_filter IS NULL OR d.user_id = user_id_filter)
    AND 1 - (de.embedding <=> query_embedding) >= similarity_threshold
    AND d.transcription_status = 'completed'
  ORDER BY similarity DESC
  LIMIT max_results;
END;
$function$;

-- Search knowledge base
CREATE OR REPLACE FUNCTION search_knowledge(query_embedding vector, target_interpreter text DEFAULT 'jung'::text, similarity_threshold double precision DEFAULT 0.7, max_results integer DEFAULT 5)
RETURNS TABLE(id bigint, content text, source text, chapter text, content_type text, similarity double precision)
LANGUAGE plpgsql
AS $function$
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
$function$;

-- Search fragments
CREATE OR REPLACE FUNCTION search_fragments(query_embedding vector, similarity_threshold double precision DEFAULT 0.0, max_results integer DEFAULT 10)
RETURNS TABLE(id uuid, text text, source text, author text, chapter integer, similarity double precision)
LANGUAGE plpgsql
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    f.id,
    f.text,
    f.source,
    f.author,
    f.chapter,
    1 - (f.embedding <=> query_embedding) as similarity
  FROM knowledge_fragments f
  WHERE 
    f.embedding IS NOT NULL
    AND 1 - (f.embedding <=> query_embedding) >= similarity_threshold
  ORDER BY similarity DESC
  LIMIT max_results;
END;
$function$;

-- Search themes
CREATE OR REPLACE FUNCTION search_themes(query_embedding vector, similarity_threshold double precision DEFAULT 0.0, max_results integer DEFAULT 10)
RETURNS TABLE(code text, label text, description text, similarity double precision)
LANGUAGE plpgsql
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    t.code,
    t.label,
    t.description,
    1 - (t.embedding <=> query_embedding) as similarity
  FROM themes t
  WHERE 
    t.embedding IS NOT NULL
    AND 1 - (t.embedding <=> query_embedding) >= similarity_threshold
  ORDER BY similarity DESC
  LIMIT max_results;
END;
$function$;

-- Cleanup stale embedding jobs
CREATE OR REPLACE FUNCTION cleanup_stale_embedding_jobs()
RETURNS integer
LANGUAGE plpgsql
AS $function$
DECLARE
  cleaned_count INT;
BEGIN
  -- Reset dreams stuck in processing for more than 30 minutes
  UPDATE dreams
  SET 
    embedding_status = 'failed',
    embedding_error = 'Processing timeout - stuck in processing state',
    embedding_attempts = embedding_attempts + 1
  WHERE 
    embedding_status = 'processing'
    AND embedding_started_at < NOW() - INTERVAL '30 minutes';
  
  GET DIAGNOSTICS cleaned_count = ROW_COUNT;
  
  -- Also update corresponding jobs
  UPDATE embedding_jobs
  SET 
    status = 'failed',
    error_message = 'Processing timeout',
    completed_at = NOW()
  WHERE 
    status = 'processing'
    AND started_at < NOW() - INTERVAL '30 minutes';
  
  RETURN cleaned_count;
END;
$function$;

-- Additional helper functions for theme processing
CREATE OR REPLACE FUNCTION get_fragment_themes(fragment_id_param uuid, min_similarity double precision DEFAULT 0.25, max_themes integer DEFAULT 10)
RETURNS TABLE(theme_code text, theme_label text, similarity double precision)
LANGUAGE plpgsql
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    t.code as theme_code,
    t.label as theme_label,
    ft.similarity
  FROM fragment_themes ft
  JOIN themes t ON t.code = ft.theme_code
  WHERE ft.fragment_id = fragment_id_param
    AND ft.similarity >= min_similarity
  ORDER BY ft.similarity DESC
  LIMIT max_themes;
END;
$function$;

CREATE OR REPLACE FUNCTION tag_fragment_batch(p_fragment_ids uuid[], p_similarity_threshold double precision DEFAULT 0.28)
RETURNS integer
LANGUAGE plpgsql
AS $function$
DECLARE
  v_count INTEGER;
BEGIN
  -- Insert fragment-theme pairs for this batch
  INSERT INTO fragment_themes (fragment_id, theme_code, similarity)
  SELECT 
    f.id,
    t.code,
    1 - (f.embedding <=> t.embedding) as similarity
  FROM knowledge_fragments f
  CROSS JOIN themes t
  WHERE f.id = ANY(p_fragment_ids)
    AND f.embedding IS NOT NULL
    AND t.embedding IS NOT NULL
    AND 1 - (f.embedding <=> t.embedding) >= p_similarity_threshold
  ON CONFLICT (fragment_id, theme_code) DO NOTHING;
  
  GET DIAGNOSTICS v_count = ROW_COUNT;
  
  RETURN v_count;
END;
$function$;

-- =====================================================
-- RLS POLICIES (if needed, add here)
-- =====================================================

-- Note: Row Level Security policies would be added here if required
-- Example:
-- ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Users can view own profile" ON profiles
--   FOR SELECT USING (auth.uid() = user_id);