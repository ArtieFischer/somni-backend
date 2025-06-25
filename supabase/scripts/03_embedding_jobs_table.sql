-- Step 3: Create embedding job queue table for async processing
CREATE TABLE IF NOT EXISTS embedding_jobs (
  id BIGSERIAL PRIMARY KEY,
  dream_id UUID NOT NULL REFERENCES dreams(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  priority INT DEFAULT 0,
  attempts INT DEFAULT 0,
  max_attempts INT DEFAULT 3,
  error_message TEXT,
  scheduled_at TIMESTAMPTZ DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Ensure only one job per dream
  UNIQUE(dream_id)
);

-- Create indexes for job queue
CREATE INDEX IF NOT EXISTS idx_embedding_jobs_status_priority ON embedding_jobs(status, priority DESC, scheduled_at) 
WHERE status IN ('pending', 'failed');
CREATE INDEX IF NOT EXISTS idx_embedding_jobs_dream_id ON embedding_jobs(dream_id);