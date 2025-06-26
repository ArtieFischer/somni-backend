-- Fix the sparse embedding query error in search_knowledge_bge function
-- Error: "cannot call jsonb_object_keys on a scalar"

-- Drop and recreate the function with proper null checks
CREATE OR REPLACE FUNCTION search_knowledge_bge(
  query_embedding vector(1024),
  query_sparse jsonb DEFAULT NULL,
  query_text text DEFAULT '',
  interpreter_filter text DEFAULT 'jung',
  source_filter text DEFAULT NULL,
  use_adaptive_scoring boolean DEFAULT true,
  match_count int DEFAULT 30,
  semantic_weight float DEFAULT 0.4,
  sparse_weight float DEFAULT 0.3,
  bm25_weight float DEFAULT 0.3
)
RETURNS TABLE(
  id integer,
  content text,
  source text,
  chapter text,
  metadata jsonb,
  semantic_score float,
  sparse_score float, 
  bm25_score float,
  hybrid_score float
)
LANGUAGE plpgsql
AS $$
DECLARE
  adjusted_semantic_weight float;
  adjusted_sparse_weight float;
  adjusted_bm25_weight float;
  total_weight float;
BEGIN
  -- Adaptive weight adjustment
  IF use_adaptive_scoring THEN
    IF query_sparse IS NULL OR jsonb_typeof(query_sparse) != 'object' THEN
      adjusted_sparse_weight := 0;
      adjusted_semantic_weight := semantic_weight + (sparse_weight * 0.7);
      adjusted_bm25_weight := bm25_weight + (sparse_weight * 0.3);
    ELSE
      adjusted_semantic_weight := semantic_weight;
      adjusted_sparse_weight := sparse_weight;
      adjusted_bm25_weight := bm25_weight;
    END IF;
  ELSE
    adjusted_semantic_weight := semantic_weight;
    adjusted_sparse_weight := sparse_weight;
    adjusted_bm25_weight := bm25_weight;
  END IF;
  
  -- Normalize weights
  total_weight := adjusted_semantic_weight + adjusted_sparse_weight + adjusted_bm25_weight;
  IF total_weight > 0 THEN
    adjusted_semantic_weight := adjusted_semantic_weight / total_weight;
    adjusted_sparse_weight := adjusted_sparse_weight / total_weight;
    adjusted_bm25_weight := adjusted_bm25_weight / total_weight;
  END IF;

  RETURN QUERY
  WITH semantic_scores AS (
    SELECT 
      kb.id,
      1 - (kb.embedding <=> query_embedding) as score
    FROM knowledge_fragments kb
    WHERE 
      kb.interpreter = interpreter_filter
      AND (source_filter IS NULL OR kb.source = source_filter)
      AND kb.embedding IS NOT NULL
  ),
  sparse_scores AS (
    SELECT 
      kb.id,
      CASE 
        -- Check if both sparse embeddings exist and are objects
        WHEN kb.metadata IS NULL OR NOT (kb.metadata ? 'sparse_embedding') THEN 0
        WHEN query_sparse IS NULL OR jsonb_typeof(query_sparse) != 'object' THEN 0
        WHEN jsonb_typeof(kb.metadata->'sparse_embedding') != 'object' THEN 0
        ELSE
          -- Calculate sparse similarity only if both are valid objects
          (
            SELECT COALESCE(SUM(
              LEAST(
                (kb.metadata->'sparse_embedding'->>key)::float,
                (query_sparse->>key)::float
              )
            ), 0)
            FROM jsonb_object_keys(kb.metadata->'sparse_embedding') AS key
            WHERE query_sparse ? key
          )
      END as score
    FROM knowledge_fragments kb
    WHERE 
      kb.interpreter = interpreter_filter
      AND (source_filter IS NULL OR kb.source = source_filter)
  ),
  bm25_scores AS (
    SELECT 
      kb.id,
      ts_rank_cd(
        to_tsvector('english', kb.text),
        plainto_tsquery('english', query_text)
      ) as score
    FROM knowledge_fragments kb
    WHERE 
      kb.interpreter = interpreter_filter
      AND (source_filter IS NULL OR kb.source = source_filter)
      AND query_text != ''
  ),
  combined_scores AS (
    SELECT 
      kb.id,
      kb.text as content,
      kb.source,
      kb.chapter::text,
      kb.metadata,
      COALESCE(ss.score, 0) as semantic_score,
      COALESCE(sp.score, 0) as sparse_score,
      COALESCE(bm.score, 0) as bm25_score,
      (
        adjusted_semantic_weight * COALESCE(ss.score, 0) +
        adjusted_sparse_weight * COALESCE(sp.score, 0) +
        adjusted_bm25_weight * COALESCE(bm.score, 0)
      ) as hybrid_score
    FROM knowledge_fragments kb
    LEFT JOIN semantic_scores ss ON kb.id = ss.id
    LEFT JOIN sparse_scores sp ON kb.id = sp.id
    LEFT JOIN bm25_scores bm ON kb.id = bm.id
    WHERE 
      kb.interpreter = interpreter_filter
      AND (source_filter IS NULL OR kb.source = source_filter)
  )
  SELECT 
    id::integer,
    content,
    source,
    chapter,
    metadata,
    semantic_score,
    sparse_score,
    bm25_score,
    hybrid_score
  FROM combined_scores
  WHERE hybrid_score > 0
  ORDER BY hybrid_score DESC
  LIMIT match_count;
END;
$$;

-- Also create a simple semantic search function as fallback
CREATE OR REPLACE FUNCTION search_knowledge_semantic(
  query_embedding vector(1024),
  interpreter_filter text DEFAULT 'jung',
  match_threshold float DEFAULT 0.5,
  match_count int DEFAULT 20
)
RETURNS TABLE(
  id integer,
  text text,
  source text, 
  chapter integer,
  metadata jsonb,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    kf.id::integer,
    kf.text,
    kf.source,
    kf.chapter,
    kf.metadata,
    (1 - (kf.embedding <=> query_embedding))::float as similarity
  FROM knowledge_fragments kf
  WHERE 
    kf.interpreter = interpreter_filter
    AND kf.embedding IS NOT NULL
    AND (1 - (kf.embedding <=> query_embedding)) > match_threshold
  ORDER BY kf.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;