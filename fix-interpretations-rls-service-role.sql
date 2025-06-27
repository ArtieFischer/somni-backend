-- Fix service role access to interpretations table
-- This resolves the 42501 insufficient privilege error

-- First, check current policies
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
WHERE tablename = 'interpretations';

-- Drop the problematic service role policy
DROP POLICY IF EXISTS "Service role has full access" ON interpretations;

-- Create a new service role policy that works correctly
-- Option 1: Using auth.role() function (recommended)
CREATE POLICY "Service role full access" ON interpretations
  FOR ALL 
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Alternative Option 2: If Option 1 doesn't work, try this
-- CREATE POLICY "Service role bypass RLS" ON interpretations
--   FOR ALL 
--   USING (
--     auth.role() = 'service_role' OR 
--     auth.jwt() ->> 'role' = 'service_role' OR
--     current_setting('request.jwt.claims', true)::json->>'role' = 'service_role'
--   );

-- Verify the policies after creation
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
WHERE tablename = 'interpretations'
ORDER BY policyname;

-- Test the fix by checking if service role can insert
-- This should work without errors after applying the fix