-- Additional SQL Scripts to Check User/Permission Issues

-- 1. Get the user_id for the dream to verify ownership
SELECT 
    d.id as dream_id,
    d.user_id,
    d.title,
    u.email as user_email,
    u.created_at as user_created
FROM dreams d
LEFT JOIN auth.users u ON d.user_id = u.id
WHERE d.id = '2b56cae5-8a73-4b99-bb83-90d594d26e39';

-- 2. Check if interpretations table has user_id column
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'interpretations'
  AND column_name = 'user_id';

-- 3. Check RLS policies more specifically
SELECT 
    policyname,
    cmd,
    qual as policy_condition,
    with_check as insert_check_condition
FROM pg_policies 
WHERE tablename = 'interpretations';

-- 4. Test if we can query interpretations as service role
-- This simulates what your backend is trying to do
SELECT COUNT(*) as can_query_count
FROM interpretations;

-- 5. Check if the interpretation data might be too large
SELECT 
    pg_size_pretty(pg_column_size(interpretation_data)) as data_size,
    interpreter_type,
    created_at
FROM interpretations
WHERE interpretation_data IS NOT NULL
ORDER BY pg_column_size(interpretation_data) DESC
LIMIT 5;

-- 6. Check for any custom types that might affect JSONB storage
SELECT 
    typname,
    typtype,
    typcategory
FROM pg_type
WHERE typname LIKE '%interpretation%'
   OR typname LIKE '%json%';

-- 7. Verify the dreams table structure for comparison
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'dreams'
  AND column_name IN ('id', 'user_id', 'interpretation_status')
ORDER BY ordinal_position;

-- 8. Check if there's a foreign key constraint
SELECT
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
WHERE tc.table_name = 'interpretations'
  AND tc.constraint_type = 'FOREIGN KEY';

-- 9. Check current RLS status
SELECT 
    relname as table_name,
    relrowsecurity as rls_enabled,
    relforcerowsecurity as rls_forced
FROM pg_class
WHERE relname IN ('dreams', 'interpretations', 'knowledge_fragments');

-- 10. Debug: See what the service role sees vs anon role
SET ROLE postgres; -- or authenticated/anon to test different roles
SELECT current_user, current_role;

-- Reset role
RESET ROLE;