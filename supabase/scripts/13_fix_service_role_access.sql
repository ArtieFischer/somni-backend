-- Fix service role access for embedding jobs
-- When RLS is enabled, we need to either disable it or create proper policies

-- Option 1: Disable RLS for embedding_jobs (RECOMMENDED)
-- This is an internal job queue table that users should never access directly
ALTER TABLE embedding_jobs DISABLE ROW LEVEL SECURITY;

-- Verify RLS is disabled
SELECT 
  'embedding_jobs' as table_name,
  relrowsecurity as rls_enabled
FROM pg_class
WHERE relname = 'embedding_jobs';

-- Also ensure the service role can properly access dreams table
-- Check current policies on dreams table
SELECT 
  pol.polname as policy_name,
  pol.polcmd as command,
  pg_get_expr(pol.polqual, pol.polrelid) as using_expression,
  pg_get_expr(pol.polwithcheck, pol.polrelid) as with_check_expression
FROM pg_policy pol
JOIN pg_class cls ON pol.polrelid = cls.oid
WHERE cls.relname = 'dreams';

-- The service role should bypass RLS by default in Supabase
-- But let's make sure there are no restrictive policies