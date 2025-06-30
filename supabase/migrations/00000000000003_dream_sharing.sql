-- =====================================================================
-- DREAM SHARING FEATURE
-- Allows users to share their dreams publicly, either anonymously or with their name
-- =====================================================================

-- Create the shared_dreams table
CREATE TABLE IF NOT EXISTS shared_dreams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dream_id uuid NOT NULL REFERENCES dreams(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Sharing settings
  is_anonymous boolean NOT NULL DEFAULT false,
  display_name text, -- User's display name when not anonymous (pulled from profiles.username)
  
  -- Status tracking
  is_active boolean NOT NULL DEFAULT true, -- Can be toggled to stop/resume sharing
  shared_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  
  -- Ensure a dream can only be shared once per user
  UNIQUE(dream_id, user_id)
);

-- Create indexes for performance
CREATE INDEX idx_shared_dreams_dream_id ON shared_dreams(dream_id);
CREATE INDEX idx_shared_dreams_user_id ON shared_dreams(user_id);
CREATE INDEX idx_shared_dreams_active ON shared_dreams(is_active) WHERE is_active = true;
CREATE INDEX idx_shared_dreams_shared_at ON shared_dreams(shared_at DESC) WHERE is_active = true;

-- Update timestamp trigger
CREATE TRIGGER update_shared_dreams_updated_at
  BEFORE UPDATE ON shared_dreams
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Enable RLS
ALTER TABLE shared_dreams ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Users can view all active shared dreams (for the public feed)
CREATE POLICY "Anyone can view active shared dreams" ON shared_dreams
  FOR SELECT
  USING (is_active = true);

-- Users can only insert their own dream shares
CREATE POLICY "Users can share their own dreams" ON shared_dreams
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id 
    AND EXISTS (
      SELECT 1 FROM dreams 
      WHERE dreams.id = dream_id 
      AND dreams.user_id = auth.uid()
    )
  );

-- Users can only update their own dream shares
CREATE POLICY "Users can update their own shared dreams" ON shared_dreams
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can only delete their own dream shares
CREATE POLICY "Users can delete their own shared dreams" ON shared_dreams
  FOR DELETE
  USING (auth.uid() = user_id);

-- Service role has full access
CREATE POLICY "Service role can manage shared dreams" ON shared_dreams
  FOR ALL
  USING (auth.role() = 'service_role');

-- Function to get shared dreams with user and dream details
CREATE OR REPLACE FUNCTION get_public_shared_dreams(
  limit_count integer DEFAULT 50,
  offset_count integer DEFAULT 0
)
RETURNS TABLE (
  share_id uuid,
  dream_id uuid,
  dream_title text,
  dream_transcript text,
  dream_created_at timestamptz,
  mood smallint,
  clarity smallint,
  is_anonymous boolean,
  display_name text,
  shared_at timestamptz,
  themes jsonb
)
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    sd.id as share_id,
    d.id as dream_id,
    d.title as dream_title,
    d.raw_transcript as dream_transcript,
    d.created_at as dream_created_at,
    d.mood,
    d.clarity,
    sd.is_anonymous,
    CASE 
      WHEN sd.is_anonymous THEN NULL 
      ELSE COALESCE(sd.display_name, p.username)
    END as display_name,
    sd.shared_at,
    COALESCE(
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'code', t.code,
            'label', t.label
          ) ORDER BY dt.similarity DESC
        )
        FROM dream_themes dt
        JOIN themes t ON t.code = dt.theme_code
        WHERE dt.dream_id = d.id
      ), 
      '[]'::jsonb
    ) as themes
  FROM shared_dreams sd
  JOIN dreams d ON d.id = sd.dream_id
  LEFT JOIN profiles p ON p.user_id = sd.user_id
  WHERE sd.is_active = true
  ORDER BY sd.shared_at DESC
  LIMIT limit_count
  OFFSET offset_count;
END;
$$;

-- Function to share a dream
CREATE OR REPLACE FUNCTION share_dream(
  p_dream_id uuid,
  p_is_anonymous boolean DEFAULT false,
  p_display_name text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_share_id uuid;
  v_user_id uuid;
BEGIN
  -- Get the authenticated user
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  -- Verify the user owns the dream
  IF NOT EXISTS (
    SELECT 1 FROM dreams 
    WHERE id = p_dream_id AND user_id = v_user_id
  ) THEN
    RAISE EXCEPTION 'Dream not found or access denied';
  END IF;
  
  -- Insert or update the share
  INSERT INTO shared_dreams (
    dream_id, 
    user_id, 
    is_anonymous, 
    display_name,
    is_active
  )
  VALUES (
    p_dream_id, 
    v_user_id, 
    p_is_anonymous, 
    p_display_name,
    true
  )
  ON CONFLICT (dream_id, user_id) 
  DO UPDATE SET
    is_anonymous = EXCLUDED.is_anonymous,
    display_name = EXCLUDED.display_name,
    is_active = true,
    updated_at = now()
  RETURNING id INTO v_share_id;
  
  RETURN v_share_id;
END;
$$;

-- Function to unshare a dream
CREATE OR REPLACE FUNCTION unshare_dream(p_dream_id uuid)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_user_id uuid;
BEGIN
  -- Get the authenticated user
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  -- Update the share to inactive
  UPDATE shared_dreams
  SET 
    is_active = false,
    updated_at = now()
  WHERE dream_id = p_dream_id 
    AND user_id = v_user_id;
  
  RETURN FOUND;
END;
$$;

-- Add to realtime subscriptions for live updates
ALTER PUBLICATION supabase_realtime ADD TABLE shared_dreams;