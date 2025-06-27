-- FINAL FIX for interpretations table RLS issues (CORRECTED)
-- This resolves the 42501 permission denied error

-- Step 1: Check current RLS status
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

-- Step 6: Grant explicit permissions (without assuming sequence name)
GRANT ALL ON interpretations TO service_role;

-- Check if there's a sequence and grant permissions if it exists
DO $$
BEGIN
    -- Check for any sequences owned by the interpretations table
    IF EXISTS (
        SELECT 1 
        FROM pg_class c 
        JOIN pg_depend d ON d.objid = c.oid 
        JOIN pg_class t ON t.oid = d.refobjid 
        WHERE c.relkind = 'S' 
        AND t.relname = 'interpretations'
    ) THEN
        -- Grant permissions on any sequences related to interpretations
        EXECUTE (
            SELECT string_agg('GRANT ALL ON SEQUENCE ' || c.relname || ' TO service_role;', ' ')
            FROM pg_class c 
            JOIN pg_depend d ON d.objid = c.oid 
            JOIN pg_class t ON t.oid = d.refobjid 
            WHERE c.relkind = 'S' 
            AND t.relname = 'interpretations'
        );
    END IF;
END $$;

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

-- Step 9: Check table structure to understand ID generation
SELECT 
    column_name, 
    data_type, 
    column_default,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'interpretations' 
AND column_name = 'id';

-- IMPORTANT: The key change is removing FORCE ROW LEVEL SECURITY
-- which was preventing service_role from bypassing RLS