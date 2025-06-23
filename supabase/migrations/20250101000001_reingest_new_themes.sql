-- Reingest new themes with BGE-M3 embeddings
-- This script drops constraints, clears data, and prepares for new theme ingestion

-- Step 1: Create backup of current themes
CREATE TABLE IF NOT EXISTS themes_backup_20250101 AS 
SELECT * FROM themes;

-- Step 2: Drop foreign key constraints temporarily
ALTER TABLE fragment_themes 
DROP CONSTRAINT IF EXISTS fragment_themes_theme_code_fkey;

ALTER TABLE theme_embedding_progress 
DROP CONSTRAINT IF EXISTS theme_embedding_progress_theme_code_fkey;

-- Step 3: Clear all data
DELETE FROM fragment_themes;
DELETE FROM theme_embedding_progress;
DELETE FROM themes;

-- Step 4: Re-add foreign key constraints
ALTER TABLE fragment_themes 
ADD CONSTRAINT fragment_themes_theme_code_fkey 
FOREIGN KEY (theme_code) 
REFERENCES themes(code) 
ON DELETE CASCADE;

ALTER TABLE theme_embedding_progress 
ADD CONSTRAINT theme_embedding_progress_theme_code_fkey 
FOREIGN KEY (theme_code) 
REFERENCES themes(code) 
ON DELETE CASCADE;

-- Step 5: Verify the tables are empty
DO $$
DECLARE
    theme_count INTEGER;
    fragment_theme_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO theme_count FROM themes;
    SELECT COUNT(*) INTO fragment_theme_count FROM fragment_themes;
    
    RAISE NOTICE 'Themes table now has % rows', theme_count;
    RAISE NOTICE 'Fragment_themes table now has % rows', fragment_theme_count;
END $$;

-- Step 6: Check that themes table has proper structure for BGE-M3
-- Should have: embedding vector(1024), embedding_version text, metadata jsonb
DO $$
DECLARE
    col_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO col_count 
    FROM information_schema.columns 
    WHERE table_name = 'themes' 
    AND column_name IN ('embedding', 'embedding_version', 'metadata')
    AND table_schema = 'public';
    
    IF col_count < 3 THEN
        RAISE NOTICE 'WARNING: Themes table may be missing BGE-M3 columns!';
    ELSE
        RAISE NOTICE 'Themes table has all required BGE-M3 columns';
    END IF;
END $$;