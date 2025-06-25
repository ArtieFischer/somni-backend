-- Fix dream_images permissions
-- Date: 2025-01-25
-- Description: Grant necessary permissions to the dream_images table for service role and authenticated users

-- Grant permissions to authenticated role for dream_images
-- This allows authenticated users to insert images for their own dreams
GRANT INSERT, SELECT, UPDATE, DELETE ON dream_images TO authenticated;

-- Grant permissions to service_role (should already have it, but ensuring it's set)
GRANT ALL ON dream_images TO service_role;

-- Ensure the RLS policies are working correctly
-- Drop existing policies first to recreate them cleanly
DROP POLICY IF EXISTS dream_images_owner_all ON dream_images;
DROP POLICY IF EXISTS dream_images_service_role_all ON dream_images;

-- Recreate the owner policy - users can manage images for their own dreams
CREATE POLICY dream_images_owner_all ON dream_images
  FOR ALL 
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM dreams 
      WHERE dreams.id = dream_images.dream_id 
      AND dreams.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM dreams 
      WHERE dreams.id = dream_images.dream_id 
      AND dreams.user_id = auth.uid()
    )
  );

-- Service role can do everything
CREATE POLICY dream_images_service_role_all ON dream_images
  FOR ALL 
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Note: Removed public read policy since dreams table doesn't have is_public column
-- If public access is needed in the future, this can be added based on actual schema

-- Verify that RLS is enabled
ALTER TABLE dream_images ENABLE ROW LEVEL SECURITY;

-- Add helpful comment
COMMENT ON TABLE dream_images IS 'Stores generated images for dreams. Each dream can have multiple images, but only one primary image.';