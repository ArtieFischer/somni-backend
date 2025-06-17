-- Drop existing function first to avoid conflicts
DROP FUNCTION IF EXISTS search_knowledge(vector(384), text, float, int);

-- Enhanced search_knowledge function with metadata filtering and boosting
-- This replaces the existing function and adds metadata filtering capabilities
CREATE OR REPLACE FUNCTION search_knowledge(
  query_embedding vector(384),
  target_interpreter text,
  similarity_threshold float DEFAULT 0.7,
  max_results int DEFAULT 5,
  metadata_filter jsonb DEFAULT NULL,
  boost_config jsonb DEFAULT NULL
)
RETURNS TABLE (
  id bigint,
  content text,
  source text,
  chapter text,
  content_type text,
  similarity float,
  metadata jsonb
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH filtered_results AS (
    SELECT 
      kb.id,
      kb.content,
      kb.source,
      kb.chapter,
      kb.content_type,
      1 - (kb.embedding <=> query_embedding) AS base_similarity,
      kb.metadata
    FROM knowledge_base kb
    WHERE 
      kb.interpreter_type = target_interpreter
      AND (metadata_filter IS NULL OR kb.metadata @> metadata_filter)
      AND (1 - (kb.embedding <=> query_embedding)) >= similarity_threshold
  ),
  boosted_results AS (
    SELECT 
      fr.*,
      fr.base_similarity + 
      CASE 
        WHEN boost_config IS NOT NULL AND boost_config->>'subtopic' IS NOT NULL 
             AND fr.metadata->>'subtopic' = ANY(ARRAY(SELECT jsonb_array_elements_text(boost_config->'subtopic')))
        THEN 0.08
        ELSE 0
      END AS final_similarity
    FROM filtered_results fr
  )
  SELECT 
    br.id,
    br.content,
    br.source,
    br.chapter,
    br.content_type,
    br.final_similarity AS similarity,
    br.metadata
  FROM boosted_results br
  ORDER BY br.final_similarity DESC
  LIMIT max_results;
END;
$$;

-- Create GIN index for metadata if not exists
CREATE INDEX IF NOT EXISTS idx_knowledge_base_metadata 
ON knowledge_base USING gin (metadata);

-- Add comment for documentation
COMMENT ON FUNCTION search_knowledge IS 'Enhanced vector similarity search with metadata filtering and boosting support for Freud and other interpreters. Backwards compatible - metadata_filter and boost_config are optional.';