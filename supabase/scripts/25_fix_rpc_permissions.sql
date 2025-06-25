-- Fix RPC function and permissions for frontend access

-- 1. Grant SELECT permission on dream_themes to authenticated users
GRANT SELECT ON dream_themes TO authenticated;

-- 2. Fix the get_dream_themes function to return proper column names
CREATE OR REPLACE FUNCTION get_dream_themes(
  p_dream_id UUID,
  p_min_similarity FLOAT DEFAULT 0.5
)
RETURNS TABLE (
  theme_code VARCHAR,
  name VARCHAR,
  description TEXT,
  similarity FLOAT,
  chunk_index INT
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- First check if user owns the dream
  IF NOT EXISTS (
    SELECT 1 FROM dreams 
    WHERE id = p_dream_id 
    AND user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  -- Return themes for the dream
  RETURN QUERY
  SELECT 
    dt.theme_code,
    t.name,
    t.description,
    COALESCE(dt.similarity, dt.score) as similarity,
    dt.chunk_index
  FROM dream_themes dt
  JOIN themes t ON dt.theme_code = t.code
  WHERE dt.dream_id = p_dream_id
    AND COALESCE(dt.similarity, dt.score) >= p_min_similarity
  ORDER BY COALESCE(dt.similarity, dt.score) DESC;
END;
$$;

-- 3. Grant execute permission on the function
GRANT EXECUTE ON FUNCTION get_dream_themes(UUID, FLOAT) TO authenticated;

-- 4. Verify themes table has required columns
SELECT 
  column_name,
  data_type
FROM information_schema.columns
WHERE table_name = 'themes'
  AND column_name IN ('code', 'name', 'description');

-- 5. If name column is missing, add it
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'themes' AND column_name = 'name'
  ) THEN
    ALTER TABLE themes ADD COLUMN name VARCHAR;
    -- Update with theme codes as names for now
    UPDATE themes SET name = code WHERE name IS NULL;
  END IF;
END $$;

-- 6. Test the function
-- SELECT * FROM get_dream_themes('c8e8b632-3a2e-4180-b13a-d48337a6c272'::uuid, 0.5);