-- Step 5: Create search and utility functions

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

-- Function to get dream themes (updated to use existing columns)
CREATE OR REPLACE FUNCTION get_dream_themes(
  p_dream_id UUID,
  p_min_similarity FLOAT DEFAULT 0.5
)
RETURNS TABLE (
  theme_code TEXT,
  theme_label TEXT,
  theme_description TEXT,
  similarity FLOAT,
  explanation TEXT
) AS $$
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
    AND COALESCE(dt.similarity, dt.score::FLOAT) >= p_min_similarity
  ORDER BY COALESCE(dt.similarity, dt.score::FLOAT) DESC;
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