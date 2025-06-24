-- Dreams Table Schema Overhaul Migration
-- Date: 2025-01-25
-- Description: Update dreams table to match new frontend schema requirements

-- Step 1: Update transcription_status_enum values
-- First, we need to add the new values before we can update existing data
DO $$ 
BEGIN
    ALTER TYPE transcription_status_enum ADD VALUE IF NOT EXISTS 'completed';
    ALTER TYPE transcription_status_enum ADD VALUE IF NOT EXISTS 'failed';
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Step 2: Update existing transcription_status values
UPDATE dreams 
SET transcription_status = 
  CASE 
    WHEN transcription_status = 'done' THEN 'completed'::transcription_status_enum
    WHEN transcription_status = 'error' THEN 'failed'::transcription_status_enum
    ELSE transcription_status
  END
WHERE transcription_status IN ('done', 'error');

-- Step 3: Add new columns
ALTER TABLE dreams 
ADD COLUMN IF NOT EXISTS mood smallint CHECK (mood >= 1 AND mood <= 5),
ADD COLUMN IF NOT EXISTS clarity smallint CHECK (clarity >= 1 AND clarity <= 100),
ADD COLUMN IF NOT EXISTS location_metadata jsonb;

-- Step 4: Remove deprecated columns
-- WARNING: This will permanently delete data in these columns
-- Make sure you have backups before running this
ALTER TABLE dreams 
DROP COLUMN IF EXISTS refined_narrative,
DROP COLUMN IF EXISTS sleep_phase,
DROP COLUMN IF EXISTS mood_before,
DROP COLUMN IF EXISTS mood_after,
DROP COLUMN IF EXISTS location,
DROP COLUMN IF EXISTS location_accuracy,
DROP COLUMN IF EXISTS embedding;

-- Step 5: Add comment to document the location_metadata structure
COMMENT ON COLUMN dreams.location_metadata IS 'JSON object containing city, country, countryCode, and method (manual or gps)';

-- Step 6: Create index on new fields for better query performance
CREATE INDEX IF NOT EXISTS idx_dreams_mood ON dreams(mood) WHERE mood IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_dreams_clarity ON dreams(clarity) WHERE clarity IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_dreams_location_metadata ON dreams USING gin(location_metadata) WHERE location_metadata IS NOT NULL;

-- Step 7: Update any existing RLS policies if needed
-- (Add any RLS policy updates here if required)

-- Note: The old enum values 'done' and 'error' cannot be removed from PostgreSQL enums
-- They will remain in the enum definition but should not be used going forward