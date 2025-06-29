-- Ensure RLS is enabled
ALTER TABLE public.elevenlabs_sessions ENABLE ROW LEVEL SECURITY;

-- Drop all existing policies to start fresh
DROP POLICY IF EXISTS "Users can insert own sessions" ON public.elevenlabs_sessions;
DROP POLICY IF EXISTS "Users can view own sessions" ON public.elevenlabs_sessions;
DROP POLICY IF EXISTS "Users can update own sessions" ON public.elevenlabs_sessions;
DROP POLICY IF EXISTS "Users can delete own sessions" ON public.elevenlabs_sessions;
DROP POLICY IF EXISTS "Service role has full access" ON public.elevenlabs_sessions;

-- Create comprehensive policies
-- Allow authenticated users to insert their own sessions
CREATE POLICY "Users can insert own sessions" ON public.elevenlabs_sessions
FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Allow authenticated users to view their own sessions
CREATE POLICY "Users can view own sessions" ON public.elevenlabs_sessions
FOR SELECT TO authenticated
USING (auth.uid() = user_id);

-- Allow authenticated users to update their own sessions
CREATE POLICY "Users can update own sessions" ON public.elevenlabs_sessions
FOR UPDATE TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Allow authenticated users to delete their own sessions
CREATE POLICY "Users can delete own sessions" ON public.elevenlabs_sessions
FOR DELETE TO authenticated
USING (auth.uid() = user_id);

-- Grant necessary permissions
GRANT ALL ON public.elevenlabs_sessions TO authenticated;
GRANT ALL ON public.elevenlabs_sessions TO service_role;

-- Also ensure dreams table has proper permissions
GRANT SELECT ON public.dreams TO authenticated;
GRANT SELECT ON public.dreams TO anon;