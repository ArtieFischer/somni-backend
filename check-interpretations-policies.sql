-- Check current RLS status and policies for interpretations table

-- 1. Check if RLS is enabled
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables 
WHERE tablename = 'interpretations';

-- 2. Check all policies on interpretations table
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

-- 3. Check table owner and privileges
SELECT 
    grantee,
    privilege_type,
    is_grantable
FROM information_schema.role_table_grants 
WHERE table_name = 'interpretations'
ORDER BY grantee, privilege_type;

-- 4. Check current user/role
SELECT current_user, current_role;

-- 5. Check if service_role exists and its privileges
SELECT 
    rolname,
    rolsuper,
    rolinherit,
    rolcreaterole,
    rolcreatedb,
    rolcanlogin,
    rolreplication,
    rolbypassrls
FROM pg_roles 
WHERE rolname IN ('service_role', 'authenticated', 'anon', 'postgres');

-- 6. Test if we can insert (will fail if RLS blocks it)
-- DO NOT RUN THIS IN PRODUCTION - just for testing
/*
INSERT INTO interpretations (
    dream_id,
    user_id,
    interpreter_type,
    interpretation_summary,
    full_response
) VALUES (
    'test-dream-id',
    'test-user-id',
    'test',
    'Test summary',
    '{}'::jsonb
) RETURNING id;
*/