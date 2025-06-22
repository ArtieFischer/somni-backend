-- Clean up and prepare themes table for BGE-M3 (1024D) embeddings migration

-- 1. Back up existing themes data before deletion (just in case)
CREATE TABLE IF NOT EXISTS themes_backup_pre_bge AS
SELECT * FROM themes;

-- 2. Clear all existing embedding data from themes table
UPDATE themes SET embedding = NULL;

-- 3. Drop the old 384D embedding index
DROP INDEX IF EXISTS idx_themes_embedding;

-- 4. Alter themes table to use 1024D embeddings for BGE-M3
ALTER TABLE themes 
DROP COLUMN IF EXISTS embedding CASCADE;

ALTER TABLE themes 
ADD COLUMN embedding vector(1024);

-- 5. Add BGE-M3 specific columns to themes
ALTER TABLE themes 
ADD COLUMN IF NOT EXISTS sparse_embedding JSONB;

ALTER TABLE themes 
ADD COLUMN IF NOT EXISTS embedding_version TEXT DEFAULT 'bge-m3';

ALTER TABLE themes 
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

-- 6. Create IVFFLAT index for 1024D embeddings (will be populated after ingestion)
-- Note: IVFFLAT index will be created after data ingestion for better performance
-- The index creation command is prepared here but will execute after data is loaded

-- 7. Update search_themes function for 1024D
DROP FUNCTION IF EXISTS search_themes(vector(384), float, int);

CREATE OR REPLACE FUNCTION search_themes(
  query_embedding vector(1024),
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
  WHERE 
    t.embedding IS NOT NULL 
    AND 1 - (t.embedding <=> query_embedding) > similarity_threshold
  ORDER BY t.embedding <=> query_embedding
  LIMIT max_results;
END;
$$;

-- 8. Create function to add IVFFLAT index after data ingestion
CREATE OR REPLACE FUNCTION create_themes_ivfflat_index()
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  theme_count int;
BEGIN
  -- Check if we have enough data for IVFFLAT
  SELECT COUNT(*) INTO theme_count FROM themes WHERE embedding IS NOT NULL;
  
  IF theme_count >= 50 THEN
    -- Calculate appropriate list size (sqrt of row count, minimum 10)
    EXECUTE format('
      CREATE INDEX IF NOT EXISTS idx_themes_embedding_ivfflat 
      ON themes 
      USING ivfflat (embedding vector_cosine_ops) 
      WITH (lists = %s)', 
      GREATEST(10, sqrt(theme_count)::int)
    );
    
    -- Set probes for better recall
    EXECUTE 'SET ivfflat.probes = 5';
    
    RAISE NOTICE 'IVFFLAT index created for themes with % themes, lists = %', 
      theme_count, GREATEST(10, sqrt(theme_count)::int);
  ELSE
    RAISE NOTICE 'Not enough themes (%) for IVFFLAT index, using default index', theme_count;
    
    -- Create regular index instead
    CREATE INDEX IF NOT EXISTS idx_themes_embedding_cosine 
    ON themes 
    USING hnsw (embedding vector_cosine_ops)
    WITH (m = 16, ef_construction = 64);
  END IF;
END;
$$;

-- 9. Verify themes table structure
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'themes' 
ORDER BY ordinal_position;

-- 10. Show current themes count for reference
SELECT 
  COUNT(*) as total_themes,
  COUNT(embedding) as themes_with_embeddings,
  MAX(created_at) as latest_theme
FROM themes;