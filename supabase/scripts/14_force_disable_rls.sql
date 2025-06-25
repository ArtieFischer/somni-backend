-- Force disable RLS and check status

-- First, check if RLS is enabled
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename = 'embedding_jobs';

-- Drop all policies on embedding_jobs first
DO $$ 
DECLARE
    pol record;
BEGIN
    FOR pol IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'embedding_jobs'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON embedding_jobs', pol.policyname);
    END LOOP;
END $$;

-- Now disable RLS
ALTER TABLE embedding_jobs DISABLE ROW LEVEL SECURITY;

-- Verify it's disabled
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename = 'embedding_jobs';

-- Also check if there are any policies left
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public' 
AND tablename = 'embedding_jobs';

-- Grant all permissions to the service role
GRANT ALL ON embedding_jobs TO service_role;
GRANT ALL ON embedding_jobs TO postgres;

-- Also ensure dreams table is accessible
GRANT ALL ON dreams TO service_role;
GRANT ALL ON dream_embeddings TO service_role;
GRANT ALL ON dream_themes TO service_role;
GRANT ALL ON themes TO service_role;

-- Check final status
SELECT 
  'Final check - RLS should be false:' as message,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('embedding_jobs', 'dreams', 'dream_embeddings', 'dream_themes');