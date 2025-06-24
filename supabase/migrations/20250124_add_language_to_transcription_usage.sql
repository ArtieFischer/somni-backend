-- Add language column to transcription_usage table
ALTER TABLE transcription_usage 
ADD COLUMN IF NOT EXISTS language_code text;

-- Add index on language_code for better query performance
CREATE INDEX IF NOT EXISTS idx_transcription_usage_language_code ON transcription_usage(language_code);

-- Add character_count column for reference (even though not used for filtering)
ALTER TABLE transcription_usage 
ADD COLUMN IF NOT EXISTS character_count integer;