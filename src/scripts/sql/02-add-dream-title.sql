-- Add title column to dreams table
ALTER TABLE dreams ADD COLUMN IF NOT EXISTS title TEXT;

-- Add index for title searches (optional, for future features)
CREATE INDEX IF NOT EXISTS idx_dreams_title ON dreams(title);

-- Comment on the column
COMMENT ON COLUMN dreams.title IS 'AI-generated creative title for the dream';