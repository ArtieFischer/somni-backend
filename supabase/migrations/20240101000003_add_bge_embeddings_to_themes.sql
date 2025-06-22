-- Migration: Add BGE-M3 embeddings to themes table
-- This migration adds support for 1024-dimensional BGE-M3 embeddings for themes

-- Step 1: Add BGE embedding column to themes table
ALTER TABLE themes 
ADD COLUMN IF NOT EXISTS embedding_bge vector(1024);

-- Step 2: Create index for BGE theme embeddings
CREATE INDEX IF NOT EXISTS idx_themes_bge_hnsw 
ON themes 
USING hnsw (embedding_bge vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- Step 3: Create function to update theme BGE embeddings
CREATE OR REPLACE FUNCTION update_theme_embedding_bge(
  theme_code TEXT,
  theme_embedding vector(1024)
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE themes 
  SET embedding_bge = theme_embedding,
      updated_at = NOW()
  WHERE code = theme_code;
  
  RETURN FOUND;
END;
$$;

-- Grant execute permission to service role
GRANT EXECUTE ON FUNCTION update_theme_embedding_bge(TEXT, vector) TO service_role;

-- Step 4: Create enhanced theme search function with BGE support
CREATE OR REPLACE FUNCTION search_themes_bge(
  query_embedding vector(1024),
  similarity_threshold FLOAT DEFAULT 0.3,
  max_results INT DEFAULT 10
)
RETURNS TABLE(
  code TEXT,
  label TEXT,
  description TEXT,
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.code,
    t.label,
    t.description,
    1 - (t.embedding_bge <=> query_embedding) as similarity
  FROM themes t
  WHERE 
    t.embedding_bge IS NOT NULL
    AND 1 - (t.embedding_bge <=> query_embedding) > similarity_threshold
  ORDER BY similarity DESC
  LIMIT max_results;
END;
$$;

-- Add comments
COMMENT ON COLUMN themes.embedding_bge IS 'BGE-M3 embeddings (1024 dimensions) for better semantic theme matching';
COMMENT ON FUNCTION search_themes_bge IS 'Search themes using BGE-M3 embeddings for semantic similarity';