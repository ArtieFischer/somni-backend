-- Create shared_dreams table for dream sharing functionality
CREATE TABLE IF NOT EXISTS shared_dreams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dream_id UUID NOT NULL REFERENCES dreams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  share_token VARCHAR(255) UNIQUE NOT NULL,
  is_anonymous BOOLEAN DEFAULT false,
  display_name VARCHAR(255),
  is_active BOOLEAN DEFAULT true,
  shared_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE,
  view_count INTEGER DEFAULT 0,
  last_viewed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_shared_dreams_dream_id ON shared_dreams(dream_id);
CREATE INDEX IF NOT EXISTS idx_shared_dreams_user_id ON shared_dreams(user_id);
CREATE INDEX IF NOT EXISTS idx_shared_dreams_share_token ON shared_dreams(share_token);
CREATE INDEX IF NOT EXISTS idx_shared_dreams_is_active ON shared_dreams(is_active);

-- Create updated_at trigger
CREATE TRIGGER update_shared_dreams_updated_at 
  BEFORE UPDATE ON shared_dreams 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE shared_dreams ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can view their own shared dreams
CREATE POLICY "Users can view own shared dreams" ON shared_dreams
  FOR SELECT USING (auth.uid() = user_id);

-- Users can create their own shared dreams
CREATE POLICY "Users can create own shared dreams" ON shared_dreams
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own shared dreams
CREATE POLICY "Users can update own shared dreams" ON shared_dreams
  FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own shared dreams
CREATE POLICY "Users can delete own shared dreams" ON shared_dreams
  FOR DELETE USING (auth.uid() = user_id);

-- Anyone can view active shared dreams by token (for public sharing)
CREATE POLICY "Public can view active shared dreams by token" ON shared_dreams
  FOR SELECT USING (is_active = true);

-- Service role has full access
CREATE POLICY "Service role has full access to shared dreams" ON shared_dreams
  FOR ALL USING (auth.jwt()->>'role' = 'service_role');

-- Add comments
COMMENT ON TABLE shared_dreams IS 'Stores shared dream information for public/anonymous sharing';
COMMENT ON COLUMN shared_dreams.share_token IS 'Unique token for accessing shared dream';
COMMENT ON COLUMN shared_dreams.is_anonymous IS 'Whether to hide user information when sharing';
COMMENT ON COLUMN shared_dreams.display_name IS 'Optional display name for anonymous sharing';
COMMENT ON COLUMN shared_dreams.is_active IS 'Whether the share link is currently active';
COMMENT ON COLUMN shared_dreams.view_count IS 'Number of times the shared dream has been viewed';