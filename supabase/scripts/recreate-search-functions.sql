-- Drop existing functions first
DROP FUNCTION IF EXISTS search_themes(vector, double precision, integer);
DROP FUNCTION IF EXISTS search_fragments(vector, double precision, integer);
DROP FUNCTION IF EXISTS search_fragments_by_theme(text, double precision, integer);

-- 1. Search themes by embedding similarity
CREATE OR REPLACE FUNCTION search_themes(
  query_embedding vector(1024),
  similarity_threshold FLOAT DEFAULT 0.0,
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
    1 - (t.embedding <=> query_embedding) as similarity
  FROM themes t
  WHERE 
    t.embedding IS NOT NULL
    AND 1 - (t.embedding <=> query_embedding) >= similarity_threshold
  ORDER BY similarity DESC
  LIMIT max_results;
END;
$$;

-- 2. Search fragments by embedding similarity
CREATE OR REPLACE FUNCTION search_fragments(
  query_embedding vector(1024),
  similarity_threshold FLOAT DEFAULT 0.0,
  max_results INT DEFAULT 10
)
RETURNS TABLE(
  id UUID,
  text TEXT,
  source TEXT,
  author TEXT,
  chapter INT,
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
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
$$;

-- 3. Search fragments by theme code
CREATE OR REPLACE FUNCTION search_fragments_by_theme(
  theme_code_param TEXT,
  similarity_threshold FLOAT DEFAULT 0.0,
  max_results INT DEFAULT 10
)
RETURNS TABLE(
  id UUID,
  text TEXT,
  source TEXT,
  author TEXT,
  chapter INT,
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    f.id,
    f.text,
    f.source,
    f.author,
    f.chapter,
    ft.similarity
  FROM knowledge_fragments f
  JOIN fragment_themes ft ON ft.fragment_id = f.id
  WHERE 
    ft.theme_code = theme_code_param
    AND ft.similarity >= similarity_threshold
  ORDER BY ft.similarity DESC
  LIMIT max_results;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION search_themes TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION search_fragments TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION search_fragments_by_theme TO anon, authenticated, service_role;

-- Test the functions
SELECT 'Functions created successfully!' as status;