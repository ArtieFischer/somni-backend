-- FINAL FIX for interpretations table RLS issues
-- This resolves the 42501 permission denied error

-- The issue: Even though service_role has rolbypassrls=true, 
-- the policies might be blocking access due to how they're configured

-- Step 1: Check if RLS is FORCED (which affects even roles with bypassrls)
SELECT 
    tablename,
    rowsecurity,
    (SELECT relforcerowsecurity FROM pg_class WHERE relname = 'interpretations') as force_rls
FROM pg_tables 
WHERE tablename = 'interpretations';

-- Step 2: Remove FORCE RLS if it's enabled (this is likely the issue!)
ALTER TABLE interpretations NO FORCE ROW LEVEL SECURITY;

-- Step 3: Ensure RLS is still enabled (but not forced)
ALTER TABLE interpretations ENABLE ROW LEVEL SECURITY;

-- Step 4: Drop ALL existing policies to start fresh
DO $$ 
DECLARE
    pol record;
BEGIN
    FOR pol IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'interpretations'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON interpretations', pol.policyname);
        RAISE NOTICE 'Dropped policy: %', pol.policyname;
    END LOOP;
END $$;

-- Step 5: Create simple, clear policies

-- Service role should bypass RLS due to rolbypassrls=true
-- But we'll add an explicit policy just in case
CREATE POLICY "service_role_all_access" ON interpretations
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Authenticated users can manage their own interpretations
CREATE POLICY "users_manage_own" ON interpretations
    FOR ALL
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Step 6: Grant explicit permissions
GRANT ALL ON interpretations TO service_role;
GRANT ALL ON SEQUENCE interpretations_id_seq TO service_role;

-- Step 7: Verify the fix
SELECT 
    'RLS Status After Fix:' as info,
    tablename,
    rowsecurity,
    (SELECT relforcerowsecurity FROM pg_class WHERE relname = 'interpretations') as force_rls,
    (SELECT count(*) FROM pg_policies WHERE tablename = 'interpretations') as policy_count
FROM pg_tables 
WHERE tablename = 'interpretations';

-- Step 8: List final policies
SELECT 
    policyname,
    cmd,
    roles,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'interpretations'
ORDER BY policyname;

-- IMPORTANT: After running this, test immediately
-- The key change is removing FORCE ROW LEVEL SECURITY
-- which was preventing service_role from bypassing RLS