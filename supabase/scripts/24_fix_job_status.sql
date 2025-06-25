-- Fix job statuses to match dream needs

-- 1. Show current job statuses
SELECT 
  status,
  COUNT(*) as count
FROM embedding_jobs
GROUP BY status;

-- 2. Show which dreams need processing and their job status
SELECT 
  d.id as dream_id,
  d.embedding_status as dream_status,
  d.embedding_attempts,
  ej.id as job_id,
  ej.status as job_status,
  ej.attempts as job_attempts,
  ej.error_message
FROM dreams d
LEFT JOIN embedding_jobs ej ON d.id = ej.dream_id
WHERE d.raw_transcript IS NOT NULL
  AND LENGTH(d.raw_transcript) > 50
  AND (d.embedding_status != 'completed' OR d.embedding_status IS NULL)
ORDER BY d.created_at DESC;

-- 3. Reset jobs for dreams that need processing
UPDATE embedding_jobs
SET 
  status = 'pending',
  attempts = 0,
  error_message = NULL,
  scheduled_at = NOW(),
  started_at = NULL,
  completed_at = NULL
WHERE dream_id IN (
  SELECT id 
  FROM dreams 
  WHERE raw_transcript IS NOT NULL
    AND LENGTH(raw_transcript) > 50
    AND (embedding_status != 'completed' OR embedding_status IS NULL)
);

-- 4. Also ensure those dreams are in pending status
UPDATE dreams
SET 
  embedding_status = 'pending',
  embedding_attempts = 0,
  embedding_error = NULL,
  embedding_started_at = NULL
WHERE id IN (
  SELECT id 
  FROM dreams 
  WHERE raw_transcript IS NOT NULL
    AND LENGTH(raw_transcript) > 50
    AND (embedding_status != 'completed' OR embedding_status IS NULL)
);

-- 5. Final check - these should now be ready
SELECT 
  COUNT(*) as ready_to_process
FROM dreams d
JOIN embedding_jobs ej ON d.id = ej.dream_id
WHERE d.embedding_status = 'pending'
  AND ej.status = 'pending';

-- 6. Show the specific dreams ready for processing
SELECT 
  d.id,
  d.title,
  d.embedding_status,
  ej.status as job_status
FROM dreams d
JOIN embedding_jobs ej ON d.id = ej.dream_id
WHERE d.embedding_status = 'pending'
  AND ej.status = 'pending';