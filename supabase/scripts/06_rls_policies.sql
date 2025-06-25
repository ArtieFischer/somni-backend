-- Step 6: Add RLS policies for security

-- Add RLS policies for dream_embeddings
ALTER TABLE dream_embeddings ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own dream embeddings" ON dream_embeddings;

-- Users can only see embeddings for their own dreams
CREATE POLICY "Users can view own dream embeddings" ON dream_embeddings
  FOR SELECT
  USING (
    dream_id IN (
      SELECT id FROM dreams WHERE user_id = auth.uid()
    )
  );

-- Add RLS policies for dream_themes (if not already enabled)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename = 'dream_themes' 
    AND rowsecurity = true
  ) THEN
    ALTER TABLE dream_themes ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own dream themes" ON dream_themes;

-- Users can only see themes for their own dreams
CREATE POLICY "Users can view own dream themes" ON dream_themes
  FOR SELECT
  USING (
    dream_id IN (
      SELECT id FROM dreams WHERE user_id = auth.uid()
    )
  );

-- Add RLS policies for embedding_jobs (admin only)
ALTER TABLE embedding_jobs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Service role can manage embedding jobs" ON embedding_jobs;

-- Only service role can access embedding jobs
CREATE POLICY "Service role can manage embedding jobs" ON embedding_jobs
  FOR ALL
  USING (auth.role() = 'service_role');