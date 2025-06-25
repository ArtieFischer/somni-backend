-- Diagnose why no dreams are ready for processing

-- 1. Show all dreams with embeddings not completed
SELECT 
  d.id,
  d.embedding_status,
  d.embedding_attempts,
  LENGTH(d.raw_transcript) as transcript_length,
  ej.id as job_id,
  ej.status as job_status,
  ej.attempts as job_attempts
FROM dreams d
LEFT JOIN embedding_jobs ej ON d.id = ej.dream_id
WHERE d.embedding_status != 'completed'
  OR d.embedding_status IS NULL
ORDER BY d.created_at DESC;

-- 2. Show pending jobs and their dream status
SELECT 
  ej.id as job_id,
  ej.dream_id,
  ej.status as job_status,
  ej.attempts as job_attempts,
  d.embedding_status as dream_status,
  d.embedding_attempts as dream_attempts
FROM embedding_jobs ej
LEFT JOIN dreams d ON ej.dream_id = d.id
WHERE ej.status = 'pending';

-- 3. Check for orphaned jobs (jobs without matching dreams)
SELECT 
  ej.dream_id as orphaned_dream_id,
  ej.status,
  ej.attempts
FROM embedding_jobs ej
LEFT JOIN dreams d ON ej.dream_id = d.id
WHERE d.id IS NULL;

-- 4. Reset ALL failed dreams to pending with 0 attempts
UPDATE dreams
SET 
  embedding_status = 'pending',
  embedding_attempts = 0,
  embedding_error = NULL,
  embedding_started_at = NULL
WHERE embedding_status IN ('failed', 'processing')
  AND raw_transcript IS NOT NULL
  AND LENGTH(raw_transcript) > 50;

-- 5. Reset ALL pending jobs to 0 attempts
UPDATE embedding_jobs
SET 
  attempts = 0,
  error_message = NULL,
  scheduled_at = NOW()
WHERE status = 'pending';

-- 6. Final check - should have processable dreams now
SELECT 
  COUNT(*) as ready_count,
  STRING_AGG(d.id::text, ', ') as dream_ids
FROM dreams d
JOIN embedding_jobs ej ON d.id = ej.dream_id
WHERE d.embedding_status = 'pending'
  AND d.embedding_attempts < 3
  AND ej.status = 'pending'
  AND ej.attempts < 3;