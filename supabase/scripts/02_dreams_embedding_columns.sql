-- Step 2: Add embedding tracking fields to dreams table
ALTER TABLE dreams 
ADD COLUMN IF NOT EXISTS embedding_status TEXT DEFAULT 'pending' 
  CHECK (embedding_status IN ('pending', 'processing', 'completed', 'failed', 'skipped')),
ADD COLUMN IF NOT EXISTS embedding_error TEXT,
ADD COLUMN IF NOT EXISTS embedding_attempts INT DEFAULT 0 CHECK (embedding_attempts >= 0 AND embedding_attempts <= 3),
ADD COLUMN IF NOT EXISTS embedding_processed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS embedding_started_at TIMESTAMPTZ;

-- Create indexes for status tracking
CREATE INDEX IF NOT EXISTS idx_dreams_embedding_status ON dreams(embedding_status) 
WHERE embedding_status IN ('pending', 'failed');

-- Prevent race conditions: only one processing attempt at a time
CREATE UNIQUE INDEX IF NOT EXISTS idx_dream_embedding_processing 
ON dreams(id) 
WHERE embedding_status = 'processing';