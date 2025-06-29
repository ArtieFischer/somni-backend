-- Fix ElevenLabs sessions INSERT policy
DROP POLICY IF EXISTS "Users can insert own sessions" ON public.elevenlabs_sessions;

CREATE POLICY "Users can insert own sessions" ON public.elevenlabs_sessions
FOR INSERT TO public
WITH CHECK (auth.uid() = user_id);

-- Ensure proper permissions on dreams table
GRANT SELECT ON public.dreams TO authenticated;

-- Also ensure RLS is enabled on elevenlabs_sessions table
ALTER TABLE public.elevenlabs_sessions ENABLE ROW LEVEL SECURITY;