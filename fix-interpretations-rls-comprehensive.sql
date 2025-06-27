-- Comprehensive fix for interpretations table RLS issues
-- This addresses the 42501 permission denied error

-- Step 1: First check current state
SELECT 'Current RLS status:' as step;
SELECT 
    tablename,
    rowsecurity,
    (SELECT count(*) FROM pg_policies WHERE tablename = 'interpretations') as policy_count
FROM pg_tables 
WHERE tablename = 'interpretations';

-- Step 2: Drop ALL existing policies (clean slate)
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

-- Step 3: Temporarily disable RLS to ensure we can create policies
ALTER TABLE interpretations DISABLE ROW LEVEL SECURITY;

-- Step 4: Grant necessary privileges to service_role
GRANT ALL ON interpretations TO service_role;
GRANT USAGE ON SEQUENCE interpretations_id_seq TO service_role;

-- Step 5: Re-enable RLS
ALTER TABLE interpretations ENABLE ROW LEVEL SECURITY;

-- Step 6: Create new, working policies

-- Policy 1: Service role bypass - MOST PERMISSIVE
CREATE POLICY "service_role_bypass_rls" ON interpretations
    AS PERMISSIVE
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Policy 2: Users can view their own interpretations
CREATE POLICY "users_select_own" ON interpretations
    AS PERMISSIVE
    FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

-- Policy 3: Users can insert their own interpretations
CREATE POLICY "users_insert_own" ON interpretations
    AS PERMISSIVE
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

-- Policy 4: Users can update their own interpretations
CREATE POLICY "users_update_own" ON interpretations
    AS PERMISSIVE
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Policy 5: Users can delete their own interpretations
CREATE POLICY "users_delete_own" ON interpretations
    AS PERMISSIVE
    FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);

-- Step 7: Also ensure anon users can't access anything (explicit deny)
-- No policy for anon = no access (default deny)

-- Step 8: Verify the new policies
SELECT 'New policies created:' as step;
SELECT 
    policyname,
    cmd,
    roles,
    permissive,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'interpretations'
ORDER BY policyname;

-- Step 9: Test with a simple query (should work for service_role)
SELECT 'Testing service role access:' as step;
SELECT count(*) as interpretation_count FROM interpretations;

-- Step 10: Force RLS to always be active (even for table owner)
ALTER TABLE interpretations FORCE ROW LEVEL SECURITY;

-- Final verification
SELECT 'Final RLS status:' as step;
SELECT 
    tablename,
    rowsecurity,
    (SELECT count(*) FROM pg_policies WHERE tablename = 'interpretations') as policy_count
FROM pg_tables 
WHERE tablename = 'interpretations';

-- If you still get errors after this, run:
-- GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO service_role;
-- GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO service_role;