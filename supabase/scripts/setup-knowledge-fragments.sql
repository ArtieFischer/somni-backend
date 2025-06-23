-- Setup script for knowledge fragments with proper permissions
-- Run this in Supabase SQL editor

-- 1. First, ensure the tables exist
CREATE TABLE IF NOT EXISTS knowledge_fragments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source TEXT NOT NULL,
  author TEXT NOT NULL,
  chapter INT,
  text TEXT NOT NULL,
  embedding vector(1024),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS fragment_themes (
  fragment_id UUID REFERENCES knowledge_fragments(id) ON DELETE CASCADE,
  theme_code TEXT REFERENCES themes(code) ON DELETE CASCADE,
  similarity REAL NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (fragment_id, theme_code)
);

-- 2. Grant permissions for authenticated users (if needed)
GRANT ALL ON knowledge_fragments TO authenticated;
GRANT ALL ON fragment_themes TO authenticated;

-- 3. Grant permissions for service role (this is what your script uses)
GRANT ALL ON knowledge_fragments TO service_role;
GRANT ALL ON fragment_themes TO service_role;

-- 4. Grant permissions for anon (if needed)
GRANT SELECT ON knowledge_fragments TO anon;
GRANT SELECT ON fragment_themes TO anon;

-- 5. Enable RLS but allow service role full access
ALTER TABLE knowledge_fragments ENABLE ROW LEVEL SECURITY;
ALTER TABLE fragment_themes ENABLE ROW LEVEL SECURITY;

-- 6. Create RLS policies for service role
CREATE POLICY "Service role has full access to knowledge_fragments"
ON knowledge_fragments
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

CREATE POLICY "Service role has full access to fragment_themes"
ON fragment_themes
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- 7. Create read policies for authenticated users
CREATE POLICY "Authenticated users can read knowledge_fragments"
ON knowledge_fragments
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can read fragment_themes"
ON fragment_themes
FOR SELECT
TO authenticated
USING (true);

-- 8. Create the indexes
CREATE INDEX IF NOT EXISTS idx_fragments_embedding_hnsw 
ON knowledge_fragments 
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

CREATE INDEX IF NOT EXISTS idx_fragments_source ON knowledge_fragments(source);
CREATE INDEX IF NOT EXISTS idx_fragments_author ON knowledge_fragments(author);
CREATE INDEX IF NOT EXISTS idx_fragment_themes_fragment ON fragment_themes(fragment_id);
CREATE INDEX IF NOT EXISTS idx_fragment_themes_theme ON fragment_themes(theme_code);
CREATE INDEX IF NOT EXISTS idx_fragment_themes_similarity ON fragment_themes(similarity);

-- 9. Create the search functions
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

-- 10. Verify permissions
SELECT 
    'knowledge_fragments permissions' as check_type,
    grantee,
    privilege_type
FROM information_schema.table_privileges
WHERE table_name = 'knowledge_fragments'
ORDER BY grantee, privilege_type;

SELECT 
    'fragment_themes permissions' as check_type,
    grantee,
    privilege_type
FROM information_schema.table_privileges
WHERE table_name = 'fragment_themes'
ORDER BY grantee, privilege_type;

-- 11. Test insert (should work now)
INSERT INTO knowledge_fragments (source, author, text)
VALUES ('test_source', 'test', 'This is a test fragment')
RETURNING id;

-- Clean up test
DELETE FROM knowledge_fragments WHERE source = 'test_source';

SELECT 'Setup complete! You can now run the ingestion script.' as status;