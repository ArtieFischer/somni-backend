-- Fix ElevenLabs sessions INSERT policy
DROP POLICY IF EXISTS "Users can insert own sessions" ON public.elevenlabs_sessions;

CREATE POLICY "Users can insert own sessions" ON public.elevenlabs_sessions
FOR INSERT TO public
WITH CHECK (auth.uid() = user_id);

-- Add missing emotions column to dreams table
ALTER TABLE public.dreams 
ADD COLUMN IF NOT EXISTS emotions TEXT[] DEFAULT '{}';

-- Ensure proper permissions on dreams table
GRANT SELECT ON public.dreams TO authenticated;
GRANT UPDATE (emotions) ON public.dreams TO authenticated;

-- Also ensure RLS is enabled on both tables
ALTER TABLE public.elevenlabs_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dreams ENABLE ROW LEVEL SECURITY;