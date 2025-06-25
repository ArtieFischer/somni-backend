-- Step 4: Update dream_themes table to match the embedding system
-- Since dream_themes already exists with different columns, we'll add the missing ones

-- Add similarity column if it doesn't exist (rename score to similarity for consistency)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='dream_themes' AND column_name='similarity') THEN
    ALTER TABLE dream_themes ADD COLUMN similarity FLOAT;
    -- Copy existing score values to similarity
    UPDATE dream_themes SET similarity = score WHERE score IS NOT NULL;
  END IF;
END $$;

-- Add chunk_index column if it doesn't exist
ALTER TABLE dream_themes 
ADD COLUMN IF NOT EXISTS chunk_index INT;

-- Add extracted_at timestamp if it doesn't exist
ALTER TABLE dream_themes 
ADD COLUMN IF NOT EXISTS extracted_at TIMESTAMPTZ DEFAULT NOW();

-- Add constraint on similarity if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                 WHERE constraint_name='dream_themes_similarity_check') THEN
    ALTER TABLE dream_themes 
    ADD CONSTRAINT dream_themes_similarity_check 
    CHECK (similarity >= 0 AND similarity <= 1);
  END IF;
END $$;

-- Create indexes for dream_themes if they don't exist
CREATE INDEX IF NOT EXISTS idx_dream_themes_dream_id ON dream_themes(dream_id);
CREATE INDEX IF NOT EXISTS idx_dream_themes_theme_code ON dream_themes(theme_code);
CREATE INDEX IF NOT EXISTS idx_dream_themes_similarity ON dream_themes(similarity DESC);

-- Add unique constraint if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                 WHERE constraint_name='dream_themes_dream_id_theme_code_key') THEN
    ALTER TABLE dream_themes 
    ADD CONSTRAINT dream_themes_dream_id_theme_code_key 
    UNIQUE(dream_id, theme_code);
  END IF;
END $$;