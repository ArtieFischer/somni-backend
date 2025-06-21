-- Fix permissions for themes table
-- Allow service role to update themes (for embeddings generation)

-- First, check if RLS is enabled
ALTER TABLE themes ENABLE ROW LEVEL SECURITY;

-- Create policy for service role to manage themes
CREATE POLICY "Service role can manage themes" 
ON themes 
FOR ALL 
TO service_role
USING (true)
WITH CHECK (true);

-- Also create a policy for anon users to read themes (for the app)
CREATE POLICY "Anyone can read themes" 
ON themes 
FOR SELECT 
TO anon, authenticated
USING (true);