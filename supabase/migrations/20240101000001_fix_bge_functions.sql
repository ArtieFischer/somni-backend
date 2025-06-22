-- Fix BGE-M3 search functions with proper column aliasing

-- Drop and recreate the BM25 function with proper aliasing
DROP FUNCTION IF EXISTS search_knowledge_bm25_enhanced;

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
      kb.id as kb_id,
      kb.content as kb_content,
      kb.source as kb_source,
      kb.chapter as kb_chapter,
      kb.content_type as kb_content_type,
      kb.metadata_v2 as kb_metadata,
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
            WHERE ts.kb_metadata @> jsonb_build_object('applicable_themes', jsonb_build_array(qt))
          )
        ELSE 1
      END as theme_multiplier
    FROM text_search ts
  )
  SELECT 
    kb_id as id,
    kb_content as content,
    kb_source as source,
    kb_chapter as chapter,
    kb_content_type as content_type,
    kb_metadata as metadata,
    rank * theme_multiplier as bm25_score,
    theme_multiplier - 1 as theme_relevance
  FROM theme_scored
  ORDER BY bm25_score DESC
  LIMIT max_results;
END;
$$;

-- Also fix the BGE search function for consistency
DROP FUNCTION IF EXISTS search_knowledge_bge;

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
      kb.id as kb_id,
      kb.content as kb_content,
      kb.source as kb_source,
      kb.chapter as kb_chapter,
      kb.content_type as kb_content_type,
      kb.metadata_v2 as kb_metadata,
      1 - (kb.embedding_bge <=> query_embedding) as kb_similarity
    FROM knowledge_base kb
    WHERE 
      kb.interpreter_type = target_interpreter
      AND kb.embedding_bge IS NOT NULL
      AND 1 - (kb.embedding_bge <=> query_embedding) > similarity_threshold
  ),
  sparse_scores AS (
    SELECT 
      kb.id as kb_id,
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
      ss.kb_id,
      ss.kb_content,
      ss.kb_source,
      ss.kb_chapter,
      ss.kb_content_type,
      ss.kb_metadata,
      ss.kb_similarity,
      sp.sparse_score,
      -- Calculate theme boost
      CASE 
        WHEN query_themes IS NOT NULL AND array_length(query_themes, 1) > 0 THEN
          COALESCE(
            0.1 * (
              SELECT COUNT(*)::FLOAT / array_length(query_themes, 1)
              FROM unnest(query_themes) AS qt
              WHERE ss.kb_metadata @> jsonb_build_object('applicable_themes', jsonb_build_array(qt))
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
              WHERE ss.kb_metadata @> jsonb_build_object('jungian_concepts', jsonb_build_array(qc))
            ),
            0
          )
        ELSE 0
      END as theme_boost
    FROM semantic_scores ss
    LEFT JOIN sparse_scores sp ON ss.kb_id = sp.kb_id
  )
  SELECT 
    tb.kb_id as id,
    tb.kb_content as content,
    tb.kb_source as source,
    tb.kb_chapter as chapter,
    tb.kb_content_type as content_type,
    tb.kb_metadata as metadata,
    tb.kb_similarity as similarity,
    tb.theme_boost,
    -- Calculate hybrid score
    CASE 
      WHEN use_hybrid AND tb.sparse_score IS NOT NULL THEN
        (0.7 * tb.kb_similarity + 0.3 * tb.sparse_score) * (1 + tb.theme_boost)
      ELSE
        tb.kb_similarity * (1 + tb.theme_boost)
    END as hybrid_score
  FROM theme_boosted tb
  ORDER BY hybrid_score DESC
  LIMIT max_results;
END;
$$;