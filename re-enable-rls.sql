-- Re-enable RLS on knowledge_base table
ALTER TABLE public.knowledge_base ENABLE ROW LEVEL SECURITY;

-- Verify it's enabled
SELECT 
    schemaname,
    tablename,
    rowsecurity 
FROM pg_tables 
WHERE tablename = 'knowledge_base';

-- The existing RLS policies should now work correctly:
-- 1. knowledge_base_public_read - allows everyone to SELECT
-- 2. knowledge_base_service_role_all - allows service_role to do everything

-- You can verify the policies are still there:
SELECT 
    polname as policy_name,
    polcmd as command,
    CASE polcmd 
        WHEN 'r' THEN 'SELECT'
        WHEN 'a' THEN 'INSERT'
        WHEN 'w' THEN 'UPDATE'
        WHEN 'd' THEN 'DELETE'
        WHEN '*' THEN 'ALL'
    END as operation
FROM pg_policy pol
JOIN pg_class pc ON pc.oid = pol.polrelid
WHERE pc.relname = 'knowledge_base';