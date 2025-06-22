-- Migration: Add BGE-M3 Support for Enhanced Embeddings
-- This migration adds support for 1024-dimensional BGE-M3 embeddings
-- and enhanced search capabilities including sparse embeddings and theme-aware retrieval

-- Step 1: Drop existing indexes if they exist
DROP INDEX IF EXISTS idx_knowledge_embeddings_vector;
DROP INDEX IF EXISTS idx_knowledge_embeddings_ivfflat;

-- Step 2: Add new columns for BGE-M3 features
ALTER TABLE knowledge_base 
ADD COLUMN IF NOT EXISTS embedding_bge vector(1024);

ALTER TABLE knowledge_base 
ADD COLUMN IF NOT EXISTS sparse_embedding JSONB;

ALTER TABLE knowledge_base 
ADD COLUMN IF NOT EXISTS metadata_v2 JSONB;

ALTER TABLE knowledge_base 
ADD COLUMN IF NOT EXISTS embedding_version TEXT DEFAULT 'minilm-v1';

-- Step 3: Create optimized indexes for 1024-dimensional vectors
CREATE INDEX IF NOT EXISTS idx_knowledge_bge_hnsw 
ON knowledge_base 
USING hnsw (embedding_bge vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

CREATE INDEX IF NOT EXISTS idx_knowledge_sparse_gin 
ON knowledge_base 
USING gin (sparse_embedding);

CREATE INDEX IF NOT EXISTS idx_knowledge_themes 
ON knowledge_base ((metadata_v2->>'applicable_themes'));

CREATE INDEX IF NOT EXISTS idx_knowledge_concepts 
ON knowledge_base ((metadata_v2->>'jungian_concepts'));

-- Step 4: Create enhanced search function with BGE-M3 support
CREATE OR REPLACE FUNCTION search_knowledge_bge(
  query_embedding vector(1024),
  query_sparse JSONB,
  query_themes TEXT[],
  query_concepts TEXT[],
  target_interpreter TEXT,
  similarity_threshold FLOAT DEFAULT 0.3,
  max_results INT DEFAULT 10,
  use_hybrid BOOLEAN DEFAULT true
)
RETURNS TABLE(
  id BIGINT,
  content TEXT,
  source TEXT,
  chapter TEXT,
  content_type TEXT,
  metadata JSONB,
  similarity FLOAT,
  theme_boost FLOAT,
  hybrid_score FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH semantic_scores AS (
    SELECT 
      kb.id,
      kb.content,
      kb.source,
      kb.chapter,
      kb.content_type,
      kb.metadata_v2 as metadata,
      1 - (kb.embedding_bge <=> query_embedding) as similarity
    FROM knowledge_base kb
    WHERE 
      kb.interpreter_type = target_interpreter
      AND kb.embedding_bge IS NOT NULL
      AND 1 - (kb.embedding_bge <=> query_embedding) > similarity_threshold
  ),
  sparse_scores AS (
    SELECT 
      kb.id,
      -- Simplified sparse similarity calculation
      COALESCE(
        (
          SELECT SUM(
            LEAST(
              COALESCE((kb.sparse_embedding->>k)::FLOAT, 0),
              COALESCE((query_sparse->>k)::FLOAT, 0)
            )
          ) / NULLIF(COUNT(DISTINCT k), 0)
          FROM (
            SELECT jsonb_object_keys(kb.sparse_embedding) AS k
            UNION
            SELECT jsonb_object_keys(query_sparse) AS k
          ) all_keys
        ),
        0
      ) as sparse_score
    FROM knowledge_base kb
    WHERE 
      kb.interpreter_type = target_interpreter
      AND kb.sparse_embedding IS NOT NULL
      AND use_hybrid = true
  ),
  theme_boosted AS (
    SELECT 
      ss.*,
      sp.sparse_score,
      -- Calculate theme boost
      CASE 
        WHEN query_themes IS NOT NULL AND array_length(query_themes, 1) > 0 THEN
          COALESCE(
            0.1 * (
              SELECT COUNT(*)::FLOAT / array_length(query_themes, 1)
              FROM unnest(query_themes) AS qt
              WHERE ss.metadata @> jsonb_build_object('applicable_themes', jsonb_build_array(qt))
            ),
            0
          )
        ELSE 0
      END +
      CASE 
        WHEN query_concepts IS NOT NULL AND array_length(query_concepts, 1) > 0 THEN
          COALESCE(
            0.15 * (
              SELECT COUNT(*)::FLOAT / array_length(query_concepts, 1)
              FROM unnest(query_concepts) AS qc
              WHERE ss.metadata @> jsonb_build_object('jungian_concepts', jsonb_build_array(qc))
            ),
            0
          )
        ELSE 0
      END as theme_boost
    FROM semantic_scores ss
    LEFT JOIN sparse_scores sp ON ss.id = sp.id
  )
  SELECT 
    tb.id,
    tb.content,
    tb.source,
    tb.chapter,
    tb.content_type,
    tb.metadata,
    tb.similarity,
    tb.theme_boost,
    -- Calculate hybrid score
    CASE 
      WHEN use_hybrid AND tb.sparse_score IS NOT NULL THEN
        (0.7 * tb.similarity + 0.3 * tb.sparse_score) * (1 + tb.theme_boost)
      ELSE
        tb.similarity * (1 + tb.theme_boost)
    END as hybrid_score
  FROM theme_boosted tb
  ORDER BY hybrid_score DESC
  LIMIT max_results;
END;
$$;

-- Step 5: Create enhanced BM25 search function
CREATE OR REPLACE FUNCTION search_knowledge_bm25_enhanced(
  query_text TEXT,
  query_themes TEXT[],
  target_interpreter TEXT,
  max_results INT DEFAULT 20
)
RETURNS TABLE(
  id BIGINT,
  content TEXT,
  source TEXT,
  chapter TEXT,
  content_type TEXT,
  metadata JSONB,
  bm25_score FLOAT,
  theme_relevance FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH text_search AS (
    SELECT 
      kb.id,
      kb.content,
      kb.source,
      kb.chapter,
      kb.content_type,
      kb.metadata_v2 as metadata,
      ts_rank_cd(
        to_tsvector('english', kb.content),
        plainto_tsquery('english', query_text)
      ) as rank
    FROM knowledge_base kb
    WHERE 
      kb.interpreter_type = target_interpreter
      AND to_tsvector('english', kb.content) @@ plainto_tsquery('english', query_text)
  ),
  theme_scored AS (
    SELECT 
      ts.*,
      -- Boost score if themes match
      CASE 
        WHEN query_themes IS NOT NULL AND array_length(query_themes, 1) > 0 THEN
          1 + 0.2 * (
            SELECT COUNT(*)::FLOAT / array_length(query_themes, 1)
            FROM unnest(query_themes) AS qt
            WHERE ts.metadata @> jsonb_build_object('applicable_themes', jsonb_build_array(qt))
          )
        ELSE 1
      END as theme_multiplier
    FROM text_search ts
  )
  SELECT 
    id,
    content,
    source,
    chapter,
    content_type,
    metadata,
    rank * theme_multiplier as bm25_score,
    theme_multiplier - 1 as theme_relevance
  FROM theme_scored
  ORDER BY bm25_score DESC
  LIMIT max_results;
END;
$$;

-- Step 6: Create migration tracking table
CREATE TABLE IF NOT EXISTS embedding_migrations (
  id SERIAL PRIMARY KEY,
  source_model TEXT NOT NULL,
  target_model TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  total_records INT,
  processed_records INT DEFAULT 0,
  failed_records INT DEFAULT 0,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  error_log JSONB
);

-- Insert initial migration record
INSERT INTO embedding_migrations (source_model, target_model, status)
VALUES ('multi-qa-MiniLM-L6-cos-v1', 'bge-m3', 'pending')
ON CONFLICT DO NOTHING;

-- Add comment to explain the migration
COMMENT ON TABLE knowledge_base IS 'Knowledge base with support for both MiniLM (384D) and BGE-M3 (1024D) embeddings';
COMMENT ON COLUMN knowledge_base.embedding IS 'Original MiniLM embeddings (384 dimensions)';
COMMENT ON COLUMN knowledge_base.embedding_bge IS 'BGE-M3 embeddings (1024 dimensions) for better semantic understanding';
COMMENT ON COLUMN knowledge_base.sparse_embedding IS 'Sparse embeddings for keyword-based retrieval (BGE-M3 feature)';
COMMENT ON COLUMN knowledge_base.metadata_v2 IS 'Enhanced metadata including theme mappings and Jungian concepts';
COMMENT ON COLUMN knowledge_base.embedding_version IS 'Version of embedding model used (minilm-v1 or bge-m3)';