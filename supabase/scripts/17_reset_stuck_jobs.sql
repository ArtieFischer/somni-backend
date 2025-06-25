-- Reset stuck processing jobs and check current state

-- 1. Reset jobs stuck in processing state
UPDATE embedding_jobs
SET 
  status = 'pending',
  started_at = NULL,
  scheduled_at = NOW()
WHERE status = 'processing';

-- 2. Check current job state with scheduling details
SELECT 
  dream_id,
  status,
  attempts,
  scheduled_at,
  NOW() as current_time,
  EXTRACT(EPOCH FROM (NOW() - scheduled_at)) as seconds_ago,
  scheduled_at <= NOW() as should_process
FROM embedding_jobs
WHERE status = 'pending'
ORDER BY scheduled_at ASC
LIMIT 10;

-- 3. Make sure there are no future-scheduled jobs
UPDATE embedding_jobs
SET scheduled_at = NOW()
WHERE status = 'pending' 
  AND scheduled_at > NOW();

-- 4. Final check
SELECT 
  COUNT(*) as ready_to_process
FROM embedding_jobs
WHERE status = 'pending'
  AND attempts < 3
  AND scheduled_at <= NOW();