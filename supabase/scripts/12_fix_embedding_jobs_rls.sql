-- Fix RLS for embedding_jobs table to allow service role access
-- The service role key should bypass RLS, but we need to ensure it's properly configured

-- First, let's check current RLS status
SELECT 
  tablename,
  rowsecurity
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename = 'embedding_jobs';

-- Option 1: Disable RLS for embedding_jobs (recommended for internal job tables)
-- This allows the service role to access without restrictions
ALTER TABLE embedding_jobs DISABLE ROW LEVEL SECURITY;

-- Option 2: If you prefer to keep RLS enabled, create a more permissive policy
-- ALTER TABLE embedding_jobs ENABLE ROW LEVEL SECURITY;
-- 
-- DROP POLICY IF EXISTS "Service role full access" ON embedding_jobs;
-- CREATE POLICY "Service role full access" ON embedding_jobs
--   FOR ALL
--   USING (true)
--   WITH CHECK (true);

-- Verify the change
SELECT 
  tablename,
  rowsecurity
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename = 'embedding_jobs';

-- Also ensure service role can access dreams table for embedding processing
-- Service role should bypass RLS on dreams table anyway, but let's verify
SELECT 
  tablename,
  rowsecurity
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename = 'dreams';