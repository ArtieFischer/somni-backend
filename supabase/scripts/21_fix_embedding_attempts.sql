-- Fix embedding attempts that exceed the limit

-- 1. Check the constraint
SELECT 
  conname as constraint_name,
  pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint
WHERE conname = 'dreams_embedding_attempts_check';

-- 2. Show dreams with high attempt counts
SELECT 
  id,
  embedding_status,
  embedding_attempts,
  embedding_error
FROM dreams
WHERE embedding_attempts >= 3
ORDER BY embedding_attempts DESC;

-- 3. Reset attempts for dreams that should be retried
-- Set attempts to 2 so the next attempt will be the 3rd (final) attempt
UPDATE dreams
SET 
  embedding_attempts = 2,
  embedding_status = 'failed'
WHERE embedding_attempts >= 3
  AND id IN (
    SELECT dream_id FROM embedding_jobs WHERE status = 'pending'
  );

-- 4. Also reset the job attempts to match
UPDATE embedding_jobs
SET attempts = 2
WHERE dream_id IN (
  SELECT id FROM dreams WHERE embedding_attempts >= 3
);

-- 5. Verify the fix
SELECT 
  d.id,
  d.embedding_status,
  d.embedding_attempts as dream_attempts,
  ej.attempts as job_attempts,
  ej.status as job_status
FROM dreams d
JOIN embedding_jobs ej ON d.id = ej.dream_id
WHERE ej.status = 'pending'
ORDER BY ej.scheduled_at;

-- 6. Show summary
SELECT 
  'Dreams ready for processing' as metric,
  COUNT(*) as count
FROM dreams d
JOIN embedding_jobs ej ON d.id = ej.dream_id
WHERE d.embedding_status IN ('pending', 'failed')
  AND d.embedding_attempts < 3
  AND ej.status = 'pending';