-- Debug why jobs aren't being picked up

-- 1. Show exact current time
SELECT NOW() as current_timestamp_utc;

-- 2. Show all pending jobs with their scheduling
SELECT 
  id,
  dream_id,
  status,
  attempts,
  scheduled_at,
  scheduled_at::text as scheduled_at_text,
  NOW()::text as now_text,
  scheduled_at <= NOW() as is_ready,
  attempts < 3 as under_limit
FROM embedding_jobs
WHERE status = 'pending'
ORDER BY scheduled_at ASC;

-- 3. Run the exact query the worker uses
SELECT dream_id
FROM embedding_jobs
WHERE status = 'pending'
  AND attempts < 3
  AND scheduled_at <= NOW()
ORDER BY priority DESC, scheduled_at ASC
LIMIT 2;

-- 4. Check timezone issues
SELECT 
  current_setting('TIMEZONE') as db_timezone,
  NOW() as now_server,
  NOW() AT TIME ZONE 'UTC' as now_utc;

-- 5. Force update scheduled_at to be definitely in the past
UPDATE embedding_jobs
SET scheduled_at = NOW() - INTERVAL '1 minute'
WHERE status = 'pending';

-- 6. Check again
SELECT 
  COUNT(*) as ready_jobs_after_update
FROM embedding_jobs
WHERE status = 'pending'
  AND attempts < 3
  AND scheduled_at <= NOW();