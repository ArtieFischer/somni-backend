-- Reset dream embedding status to allow processing

-- 1. Check current dream statuses
SELECT 
  id,
  embedding_status,
  embedding_attempts,
  embedding_started_at,
  embedding_error
FROM dreams
WHERE id IN (
  SELECT dream_id FROM embedding_jobs WHERE status = 'pending'
);

-- 2. Reset dreams that are stuck in processing state
UPDATE dreams
SET 
  embedding_status = 'pending',
  embedding_started_at = NULL
WHERE embedding_status = 'processing'
  AND id IN (
    SELECT dream_id FROM embedding_jobs WHERE status = 'pending'
  );

-- 3. Reset dreams that have failed
UPDATE dreams
SET 
  embedding_status = 'pending',
  embedding_error = NULL
WHERE embedding_status = 'failed'
  AND embedding_attempts < 3
  AND id IN (
    SELECT dream_id FROM embedding_jobs WHERE status = 'pending'
  );

-- 4. Check updated status
SELECT 
  embedding_status,
  COUNT(*) as count
FROM dreams
WHERE id IN (
  SELECT dream_id FROM embedding_jobs
)
GROUP BY embedding_status;

-- 5. Show dreams ready for processing
SELECT 
  d.id,
  d.embedding_status,
  d.embedding_attempts,
  ej.status as job_status
FROM dreams d
JOIN embedding_jobs ej ON d.id = ej.dream_id
WHERE ej.status = 'pending'
ORDER BY ej.scheduled_at;