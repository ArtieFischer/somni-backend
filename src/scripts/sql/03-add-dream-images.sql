-- Add image-related columns to dreams table
ALTER TABLE dreams ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE dreams ADD COLUMN IF NOT EXISTS image_prompt TEXT;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_dreams_image_url ON dreams(image_url);

-- Comments on the columns
COMMENT ON COLUMN dreams.image_url IS 'URL to the AI-generated dream image stored in Supabase storage';
COMMENT ON COLUMN dreams.image_prompt IS 'The prompt used to generate the dream image for debugging purposes';