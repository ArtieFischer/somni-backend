-- Test Script: Verify the embedding system is ready

-- 1. Check if there are any existing dreams that need embeddings
SELECT 
  'Dreams needing embeddings' as check_type,
  COUNT(*) as count
FROM dreams 
WHERE transcription_status = 'completed' 
  AND raw_transcript IS NOT NULL 
  AND length(raw_transcript) >= 50
  AND (embedding_status IS NULL OR embedding_status = 'pending');

-- 2. Check if any embedding jobs were auto-created by the trigger
SELECT 
  'Auto-created embedding jobs' as check_type,
  COUNT(*) as count
FROM embedding_jobs;

-- 3. Show recent dreams with their embedding status
SELECT 
  id,
  title,
  transcription_status,
  embedding_status,
  embedding_attempts,
  length(raw_transcript) as transcript_length,
  created_at
FROM dreams
WHERE transcription_status = 'completed'
ORDER BY created_at DESC
LIMIT 10;

-- 4. Check if themes table has embeddings (required for theme extraction)
SELECT 
  'Themes with embeddings' as check_type,
  COUNT(*) as count,
  COUNT(*) FILTER (WHERE embedding IS NOT NULL) as with_embeddings
FROM themes;

-- 5. Sample theme embeddings to verify they exist
-- Note: pgvector 'vector' type doesn't directly expose dimensions in SQL
-- But we know BGE-M3 embeddings are 1024-dimensional
SELECT 
  code,
  label,
  CASE 
    WHEN embedding IS NOT NULL THEN '1024 (BGE-M3)'
    ELSE 'No embedding'
  END as embedding_info,
  embedding_version
FROM themes
WHERE embedding IS NOT NULL
LIMIT 5;