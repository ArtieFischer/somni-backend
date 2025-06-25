-- Fix RLS policies for transcription_usage table
-- The edge function uses service role, so we need to adjust the policies

-- Drop existing policies
DROP POLICY IF EXISTS "service_role_bypass_all" ON transcription_usage;
DROP POLICY IF EXISTS "users_select_own" ON transcription_usage;
DROP POLICY IF EXISTS "users_insert_own" ON transcription_usage;

-- Create new policies that work with service role

-- Policy 1: Service role can do everything (edge functions use service role)
CREATE POLICY "service_role_all_access" ON transcription_usage
    FOR ALL
    USING (
        auth.role() = 'service_role'
        OR
        auth.jwt()->>'role' = 'service_role'
    );

-- Policy 2: Authenticated users can view their own usage
CREATE POLICY "users_view_own" ON transcription_usage
    FOR SELECT
    USING (
        auth.role() = 'authenticated' 
        AND 
        auth.uid() = user_id
    );

-- Policy 3: Allow inserts when the JWT contains a valid user_id that matches
-- This allows edge functions to insert on behalf of users
CREATE POLICY "allow_authenticated_inserts" ON transcription_usage
    FOR INSERT
    WITH CHECK (
        -- Service role can insert
        auth.role() = 'service_role'
        OR
        auth.jwt()->>'role' = 'service_role'
        OR
        -- Or authenticated user inserting their own record
        (auth.role() = 'authenticated' AND auth.uid() = user_id)
    );