-- Create a function to update theme embeddings
-- This function runs with SECURITY DEFINER to bypass RLS

CREATE OR REPLACE FUNCTION update_theme_embedding(
  theme_code TEXT,
  theme_embedding vector(384)
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE themes 
  SET embedding = theme_embedding,
      updated_at = NOW()
  WHERE code = theme_code;
  
  RETURN FOUND;
END;
$$;

-- Grant execute permission to service role
GRANT EXECUTE ON FUNCTION update_theme_embedding(TEXT, vector) TO service_role;

-- Also ensure service role can use the vector type
GRANT USAGE ON SCHEMA extensions TO service_role;
GRANT ALL ON ALL TABLES IN SCHEMA extensions TO service_role;