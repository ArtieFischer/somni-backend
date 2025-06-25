-- Check the current state of embedding jobs and dreams

-- 1. Check all embedding jobs
SELECT 
  dream_id,
  status,
  attempts,
  priority,
  scheduled_at,
  created_at,
  started_at,
  completed_at,
  error_message
FROM embedding_jobs
ORDER BY created_at DESC;

-- 2. Check dreams that need embeddings
SELECT 
  id,
  user_id,
  embedding_status,
  embedding_attempts,
  embedding_error,
  embedding_started_at,
  embedding_processed_at,
  created_at,
  LENGTH(raw_transcript) as transcript_length
FROM dreams
WHERE raw_transcript IS NOT NULL
  AND LENGTH(raw_transcript) > 50
  AND (embedding_status IS NULL OR embedding_status IN ('pending', 'failed'))
ORDER BY created_at DESC;

-- 3. Check if there are any jobs that should be picked up
SELECT 
  dream_id,
  status,
  attempts,
  scheduled_at,
  NOW() as current_time,
  scheduled_at <= NOW() as should_process,
  attempts < 3 as under_retry_limit
FROM embedding_jobs
WHERE status = 'pending'
  AND attempts < 3
ORDER BY priority DESC, scheduled_at ASC;

-- 4. Check if we need to create new jobs for dreams
SELECT 
  d.id as dream_id,
  d.embedding_status,
  d.created_at,
  ej.dream_id as has_job
FROM dreams d
LEFT JOIN embedding_jobs ej ON d.id = ej.dream_id
WHERE d.raw_transcript IS NOT NULL
  AND LENGTH(d.raw_transcript) > 50
  AND d.embedding_status IN ('pending', NULL)
  AND ej.dream_id IS NULL;

-- 5. Summary stats
SELECT 
  'Total Dreams' as metric,
  COUNT(*) as count
FROM dreams
WHERE raw_transcript IS NOT NULL
UNION ALL
SELECT 
  'Dreams with embeddings completed',
  COUNT(*)
FROM dreams
WHERE embedding_status = 'completed'
UNION ALL
SELECT 
  'Dreams pending embedding',
  COUNT(*)
FROM dreams
WHERE embedding_status = 'pending' OR embedding_status IS NULL
UNION ALL
SELECT 
  'Total embedding jobs',
  COUNT(*)
FROM embedding_jobs
UNION ALL
SELECT 
  'Pending jobs',
  COUNT(*)
FROM embedding_jobs
WHERE status = 'pending' AND attempts < 3 AND scheduled_at <= NOW();