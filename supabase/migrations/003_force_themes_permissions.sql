-- Force fix permissions for themes table
-- This migration ensures service role can update themes for embedding generation

-- Drop all existing policies on themes table
DROP POLICY IF EXISTS "Service role can manage themes" ON themes;
DROP POLICY IF EXISTS "Anyone can read themes" ON themes;

-- Temporarily disable RLS to ensure we can make changes
ALTER TABLE themes DISABLE ROW LEVEL SECURITY;

-- Re-enable RLS
ALTER TABLE themes ENABLE ROW LEVEL SECURITY;

-- Create a permissive policy for service role with explicit permissions
CREATE POLICY "service_role_all_access" ON themes
    AS PERMISSIVE
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Create read policy for application access
CREATE POLICY "public_read_access" ON themes
    AS PERMISSIVE
    FOR SELECT
    TO anon, authenticated
    USING (true);

-- Grant explicit permissions to service role (belt and suspenders approach)
GRANT ALL ON themes TO service_role;

-- Verify the policies were created
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'themes' 
        AND policyname = 'service_role_all_access'
    ) THEN
        RAISE EXCEPTION 'Failed to create service role policy';
    END IF;
END $$;