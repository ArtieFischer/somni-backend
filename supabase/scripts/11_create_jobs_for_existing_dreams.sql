-- Create embedding jobs for existing dreams that need them
-- Run this if you want to process existing dreams

-- First, see how many dreams would be processed
SELECT 
  COUNT(*) as dreams_to_process
FROM dreams 
WHERE transcription_status = 'completed' 
  AND raw_transcript IS NOT NULL 
  AND length(raw_transcript) >= 50
  AND (embedding_status IS NULL OR embedding_status = 'pending')
  AND NOT EXISTS (
    SELECT 1 FROM embedding_jobs ej WHERE ej.dream_id = dreams.id
  );

-- Create jobs for all existing dreams that need embeddings
-- Uncomment and run this INSERT to create the jobs:
/*
INSERT INTO embedding_jobs (dream_id, priority, scheduled_at)
SELECT 
  id as dream_id,
  0 as priority,
  NOW() as scheduled_at
FROM dreams 
WHERE transcription_status = 'completed' 
  AND raw_transcript IS NOT NULL 
  AND length(raw_transcript) >= 50
  AND (embedding_status IS NULL OR embedding_status = 'pending')
  AND NOT EXISTS (
    SELECT 1 FROM embedding_jobs ej WHERE ej.dream_id = dreams.id
  )
ORDER BY created_at DESC -- Process newest dreams first
ON CONFLICT (dream_id) DO NOTHING;
*/

-- After running the INSERT, check how many jobs were created:
/*
SELECT 
  status, 
  COUNT(*) as count
FROM embedding_jobs
GROUP BY status
ORDER BY status;
*/