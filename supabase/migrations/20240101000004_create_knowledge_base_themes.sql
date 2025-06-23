-- Create knowledge base fragments table with theme associations
-- This replaces the complex knowledge_base structure with a simpler approach

-- 1. Create fragments table for book content
CREATE TABLE IF NOT EXISTS knowledge_fragments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source TEXT NOT NULL,           -- 'Jung_CW09', 'Jung_CW12', etc.
  author TEXT NOT NULL,           -- 'jung', 'freud', 'mary'
  chapter INT,                    -- Chapter or section number
  text TEXT NOT NULL,             -- The actual text content
  embedding vector(1024),         -- BGE-M3 embedding
  metadata JSONB DEFAULT '{}',    -- Additional metadata
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create junction table for fragment-theme relationships
CREATE TABLE IF NOT EXISTS fragment_themes (
  fragment_id UUID REFERENCES knowledge_fragments(id) ON DELETE CASCADE,
  theme_code TEXT REFERENCES themes(code) ON DELETE CASCADE,
  similarity REAL NOT NULL,       -- Cosine similarity score
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (fragment_id, theme_code)
);

-- 3. Create indexes for performance
CREATE INDEX idx_fragments_embedding_hnsw 
ON knowledge_fragments 
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

CREATE INDEX idx_fragments_source ON knowledge_fragments(source);
CREATE INDEX idx_fragments_author ON knowledge_fragments(author);
CREATE INDEX idx_fragment_themes_fragment ON fragment_themes(fragment_id);
CREATE INDEX idx_fragment_themes_theme ON fragment_themes(theme_code);
CREATE INDEX idx_fragment_themes_similarity ON fragment_themes(similarity);

-- 4. Create function to find fragments by theme
CREATE OR REPLACE FUNCTION search_fragments_by_theme(
  theme_code_param TEXT,
  similarity_threshold FLOAT DEFAULT 0.25,
  max_results INT DEFAULT 20
)
RETURNS TABLE (
  id UUID,
  source TEXT,
  author TEXT,
  text TEXT,
  similarity FLOAT,
  tag_similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH theme_embedding AS (
    SELECT embedding 
    FROM themes 
    WHERE code = theme_code_param
    LIMIT 1
  ),
  candidates AS (
    SELECT 
      f.id,
      f.source,
      f.author,
      f.text,
      1 - (f.embedding <=> (SELECT embedding FROM theme_embedding)) as sim
    FROM knowledge_fragments f
    WHERE f.embedding IS NOT NULL
    ORDER BY f.embedding <=> (SELECT embedding FROM theme_embedding)
    LIMIT max_results
  )
  SELECT 
    c.id,
    c.source,
    c.author,
    c.text,
    c.sim as similarity,
    ft.similarity as tag_similarity
  FROM candidates c
  LEFT JOIN fragment_themes ft ON ft.fragment_id = c.id AND ft.theme_code = theme_code_param
  WHERE c.sim >= similarity_threshold
  ORDER BY c.sim DESC;
END;
$$;

-- 5. Create function to get top themes for a fragment
CREATE OR REPLACE FUNCTION get_fragment_themes(
  fragment_id_param UUID,
  min_similarity FLOAT DEFAULT 0.25,
  max_themes INT DEFAULT 10
)
RETURNS TABLE (
  theme_code TEXT,
  theme_label TEXT,
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
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
$$;

-- 6. Create function to tag fragments with themes (offline batch process)
CREATE OR REPLACE FUNCTION tag_fragments_with_themes(
  similarity_threshold FLOAT DEFAULT 0.28,
  batch_size INT DEFAULT 100
)
RETURNS TABLE (
  fragments_processed INT,
  relationships_created INT
)
LANGUAGE plpgsql
AS $$
DECLARE
  total_fragments INT := 0;
  total_relationships INT := 0;
  fragment_batch RECORD;
BEGIN
  -- Clear existing relationships
  DELETE FROM fragment_themes;
  
  -- Process fragments in batches
  FOR fragment_batch IN 
    SELECT id, embedding
    FROM knowledge_fragments
    WHERE embedding IS NOT NULL
    LIMIT batch_size
  LOOP
    -- Insert theme relationships for this fragment
    INSERT INTO fragment_themes (fragment_id, theme_code, similarity)
    SELECT 
      fragment_batch.id,
      t.code,
      1 - (fragment_batch.embedding <=> t.embedding) as sim
    FROM themes t
    WHERE t.embedding IS NOT NULL
      AND 1 - (fragment_batch.embedding <=> t.embedding) >= similarity_threshold;
    
    total_fragments := total_fragments + 1;
    total_relationships := total_relationships + 
      (SELECT COUNT(*) FROM fragment_themes WHERE fragment_id = fragment_batch.id);
  END LOOP;
  
  RETURN QUERY SELECT total_fragments, total_relationships;
END;
$$;

-- 7. Add some helper views
CREATE OR REPLACE VIEW fragment_theme_stats AS
SELECT 
  f.source,
  f.author,
  COUNT(DISTINCT f.id) as fragment_count,
  COUNT(DISTINCT ft.theme_code) as unique_themes,
  AVG(ft.similarity) as avg_similarity
FROM knowledge_fragments f
LEFT JOIN fragment_themes ft ON ft.fragment_id = f.id
GROUP BY f.source, f.author;

-- 8. Cleanup old knowledge_base table if needed (commented out for safety)
-- DROP TABLE IF EXISTS knowledge_base CASCADE;