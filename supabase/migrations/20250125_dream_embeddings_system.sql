-- Dream Embeddings System Migration
-- This migration creates the infrastructure for generating and storing dream embeddings
-- for semantic search, theme extraction, and similar dream discovery

-- Create dream_embeddings table for storing chunked embeddings
CREATE TABLE IF NOT EXISTS dream_embeddings (
  id BIGSERIAL PRIMARY KEY,
  dream_id UUID NOT NULL REFERENCES dreams(id) ON DELETE CASCADE,
  embedding vector(1024) NOT NULL,
  chunk_index INT NOT NULL DEFAULT 0,
  chunk_text TEXT NOT NULL,
  token_count INT NOT NULL CHECK (token_count > 0),
  embedding_version TEXT NOT NULL DEFAULT 'bge-m3-v1',
  processing_time_ms INT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Ensure unique embedding per dream and chunk
  UNIQUE(dream_id, chunk_index, embedding_version)
);

-- Add embedding tracking fields to dreams table
ALTER TABLE dreams 
ADD COLUMN IF NOT EXISTS embedding_status TEXT DEFAULT 'pending' 
  CHECK (embedding_status IN ('pending', 'processing', 'completed', 'failed', 'skipped')),
ADD COLUMN IF NOT EXISTS embedding_error TEXT,
ADD COLUMN IF NOT EXISTS embedding_attempts INT DEFAULT 0 CHECK (embedding_attempts >= 0 AND embedding_attempts <= 3),
ADD COLUMN IF NOT EXISTS embedding_processed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS embedding_started_at TIMESTAMPTZ;

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_dream_embeddings_dream_id ON dream_embeddings(dream_id);
CREATE INDEX IF NOT EXISTS idx_dream_embeddings_version ON dream_embeddings(embedding_version);
CREATE INDEX IF NOT EXISTS idx_dreams_embedding_status ON dreams(embedding_status) WHERE embedding_status IN ('pending', 'failed');

-- Create vector similarity index for semantic search
CREATE INDEX IF NOT EXISTS idx_dream_embeddings_vector ON dream_embeddings 
USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Prevent race conditions: only one processing attempt at a time
CREATE UNIQUE INDEX IF NOT EXISTS idx_dream_embedding_processing 
ON dreams(id) 
WHERE embedding_status = 'processing';

-- Create dream_themes table for storing extracted themes
CREATE TABLE IF NOT EXISTS dream_themes (
  id BIGSERIAL PRIMARY KEY,
  dream_id UUID NOT NULL REFERENCES dreams(id) ON DELETE CASCADE,
  theme_code TEXT NOT NULL REFERENCES themes(code) ON DELETE CASCADE,
  similarity FLOAT NOT NULL CHECK (similarity >= 0 AND similarity <= 1),
  chunk_index INT,
  extracted_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Each dream-theme combination should be unique
  UNIQUE(dream_id, theme_code)
);

-- Create indexes for dream_themes
CREATE INDEX IF NOT EXISTS idx_dream_themes_dream_id ON dream_themes(dream_id);
CREATE INDEX IF NOT EXISTS idx_dream_themes_theme_code ON dream_themes(theme_code);
CREATE INDEX IF NOT EXISTS idx_dream_themes_similarity ON dream_themes(similarity DESC);

-- Create embedding job queue table for async processing
CREATE TABLE IF NOT EXISTS embedding_jobs (
  id BIGSERIAL PRIMARY KEY,
  dream_id UUID NOT NULL REFERENCES dreams(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  priority INT DEFAULT 0,
  attempts INT DEFAULT 0,
  max_attempts INT DEFAULT 3,
  error_message TEXT,
  scheduled_at TIMESTAMPTZ DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Ensure only one job per dream
  UNIQUE(dream_id)
);

-- Create indexes for job queue
CREATE INDEX IF NOT EXISTS idx_embedding_jobs_status_priority ON embedding_jobs(status, priority DESC, scheduled_at) 
WHERE status IN ('pending', 'failed');
CREATE INDEX IF NOT EXISTS idx_embedding_jobs_dream_id ON embedding_jobs(dream_id);

-- Function to search similar dreams by embedding
CREATE OR REPLACE FUNCTION search_similar_dreams(
  query_embedding vector(1024),
  user_id_filter UUID DEFAULT NULL,
  similarity_threshold FLOAT DEFAULT 0.7,
  max_results INT DEFAULT 10
)
RETURNS TABLE (
  dream_id UUID,
  similarity FLOAT,
  chunk_text TEXT,
  chunk_index INT,
  dream_title TEXT,
  created_at TIMESTAMPTZ
) AS $$
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
$$ LANGUAGE plpgsql;

-- Function to get dream themes
CREATE OR REPLACE FUNCTION get_dream_themes(
  p_dream_id UUID,
  p_min_similarity FLOAT DEFAULT 0.5
)
RETURNS TABLE (
  theme_code TEXT,
  theme_label TEXT,
  theme_description TEXT,
  similarity FLOAT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    dt.theme_code,
    t.label as theme_label,
    t.description as theme_description,
    dt.similarity
  FROM dream_themes dt
  JOIN themes t ON t.code = dt.theme_code
  WHERE 
    dt.dream_id = p_dream_id
    AND dt.similarity >= p_min_similarity
  ORDER BY dt.similarity DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to clean up stale processing jobs
CREATE OR REPLACE FUNCTION cleanup_stale_embedding_jobs()
RETURNS INT AS $$
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
$$ LANGUAGE plpgsql;

-- Add RLS policies for dream_embeddings
ALTER TABLE dream_embeddings ENABLE ROW LEVEL SECURITY;

-- Users can only see embeddings for their own dreams
CREATE POLICY "Users can view own dream embeddings" ON dream_embeddings
  FOR SELECT
  USING (
    dream_id IN (
      SELECT id FROM dreams WHERE user_id = auth.uid()
    )
  );

-- Add RLS policies for dream_themes
ALTER TABLE dream_themes ENABLE ROW LEVEL SECURITY;

-- Users can only see themes for their own dreams
CREATE POLICY "Users can view own dream themes" ON dream_themes
  FOR SELECT
  USING (
    dream_id IN (
      SELECT id FROM dreams WHERE user_id = auth.uid()
    )
  );

-- Add RLS policies for embedding_jobs (admin only)
ALTER TABLE embedding_jobs ENABLE ROW LEVEL SECURITY;

-- Only service role can access embedding jobs
CREATE POLICY "Service role can manage embedding jobs" ON embedding_jobs
  FOR ALL
  USING (auth.role() = 'service_role');

-- Create a trigger to automatically create embedding job when dream is transcribed
CREATE OR REPLACE FUNCTION create_embedding_job_on_transcription()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql;

-- Create the trigger
DROP TRIGGER IF EXISTS trigger_create_embedding_job ON dreams;
CREATE TRIGGER trigger_create_embedding_job
  AFTER UPDATE OF transcription_status ON dreams
  FOR EACH ROW
  EXECUTE FUNCTION create_embedding_job_on_transcription();

-- Add comments for documentation
COMMENT ON TABLE dream_embeddings IS 'Stores BGE-M3 embeddings for dream transcripts, chunked for long dreams';
COMMENT ON TABLE dream_themes IS 'Stores extracted themes from dreams based on embedding similarity';
COMMENT ON TABLE embedding_jobs IS 'Queue for async embedding generation jobs';
COMMENT ON COLUMN dreams.embedding_status IS 'Status of embedding generation: pending, processing, completed, failed, skipped';
COMMENT ON COLUMN dreams.embedding_attempts IS 'Number of attempts to generate embeddings, max 3';
COMMENT ON FUNCTION search_similar_dreams IS 'Search for similar dreams using vector similarity';
COMMENT ON FUNCTION get_dream_themes IS 'Get themes extracted from a specific dream';
COMMENT ON FUNCTION cleanup_stale_embedding_jobs IS 'Clean up jobs stuck in processing state';