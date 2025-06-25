-- Deep diagnostic to find the issue

-- 1. Show ALL dreams (not just ones with jobs)
SELECT 
  id,
  embedding_status,
  embedding_attempts,
  LENGTH(raw_transcript) as transcript_length,
  created_at
FROM dreams
WHERE raw_transcript IS NOT NULL
  AND LENGTH(raw_transcript) > 50
ORDER BY created_at DESC
LIMIT 20;

-- 2. Show ALL embedding jobs
SELECT 
  id,
  dream_id,
  status,
  attempts,
  error_message,
  created_at
FROM embedding_jobs
ORDER BY created_at DESC;

-- 3. Find dreams that need embeddings but don't have jobs
SELECT 
  d.id as dream_id,
  d.embedding_status,
  d.created_at,
  'No job exists' as issue
FROM dreams d
LEFT JOIN embedding_jobs ej ON d.id = ej.dream_id
WHERE d.raw_transcript IS NOT NULL
  AND LENGTH(d.raw_transcript) > 50
  AND (d.embedding_status IS NULL OR d.embedding_status IN ('pending', 'failed'))
  AND ej.id IS NULL;

-- 4. Check if the job dream_ids actually exist in dreams table
SELECT 
  ej.dream_id,
  CASE WHEN d.id IS NULL THEN 'Dream does not exist!' ELSE 'Dream exists' END as status
FROM embedding_jobs ej
LEFT JOIN dreams d ON ej.dream_id = d.id;

-- 5. Create jobs for dreams that need them
INSERT INTO embedding_jobs (dream_id, status, priority, attempts, scheduled_at)
SELECT 
  d.id,
  'pending',
  0,
  0,
  NOW()
FROM dreams d
LEFT JOIN embedding_jobs ej ON d.id = ej.dream_id
WHERE d.raw_transcript IS NOT NULL
  AND LENGTH(d.raw_transcript) > 50
  AND (d.embedding_status = 'pending' OR d.embedding_status IS NULL)
  AND ej.id IS NULL
ON CONFLICT (dream_id) DO NOTHING;

-- 6. Final status check
SELECT 
  'Total dreams with transcripts' as metric,
  COUNT(*)
FROM dreams 
WHERE raw_transcript IS NOT NULL AND LENGTH(raw_transcript) > 50
UNION ALL
SELECT 
  'Dreams needing embeddings',
  COUNT(*)
FROM dreams 
WHERE raw_transcript IS NOT NULL 
  AND LENGTH(raw_transcript) > 50
  AND (embedding_status != 'completed' OR embedding_status IS NULL)
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
WHERE status = 'pending';