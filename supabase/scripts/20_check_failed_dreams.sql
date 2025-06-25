-- Check the failed dreams and their job status

-- 1. Show all dreams with failed status and their corresponding jobs
SELECT 
  d.id as dream_id,
  d.embedding_status as dream_status,
  d.embedding_attempts,
  d.embedding_error,
  ej.id as job_id,
  ej.status as job_status,
  ej.attempts as job_attempts,
  ej.scheduled_at,
  ej.error_message as job_error
FROM dreams d
LEFT JOIN embedding_jobs ej ON d.id = ej.dream_id
WHERE d.embedding_status = 'failed'
ORDER BY ej.scheduled_at;

-- 2. Try the exact update query the service uses (for one dream as test)
-- This simulates what acquireProcessingLock does
WITH test_dream AS (
  SELECT id 
  FROM dreams 
  WHERE embedding_status = 'failed' 
  LIMIT 1
)
UPDATE dreams
SET 
  embedding_status = 'processing',
  embedding_started_at = NOW(),
  embedding_attempts = embedding_attempts + 1
WHERE id IN (SELECT id FROM test_dream)
  AND embedding_status IN ('pending', 'failed')
RETURNING id, embedding_status, embedding_attempts;

-- 3. If update worked, reset it back
UPDATE dreams
SET 
  embedding_status = 'failed',
  embedding_started_at = NULL
WHERE embedding_status = 'processing'
  AND id IN (
    SELECT id FROM dreams WHERE embedding_status = 'processing' LIMIT 1
  );

-- 4. Check if there are permission issues on dreams table
SELECT 
  has_table_privilege('service_role', 'dreams', 'UPDATE') as can_update,
  has_table_privilege('service_role', 'dreams', 'SELECT') as can_select;

-- 5. Show dreams that SHOULD be processable
SELECT 
  d.id,
  d.embedding_status,
  d.embedding_attempts,
  LENGTH(d.raw_transcript) as transcript_length,
  ej.status as job_status
FROM dreams d
JOIN embedding_jobs ej ON d.id = ej.dream_id
WHERE d.embedding_status IN ('pending', 'failed')
  AND ej.status = 'pending'
  AND d.embedding_attempts < 3;