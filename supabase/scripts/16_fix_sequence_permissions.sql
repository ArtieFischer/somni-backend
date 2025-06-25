-- Fix permissions for sequences used by embedding tables

-- Grant usage on all sequences to service_role
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO postgres;

-- Specifically grant on the sequences we need
GRANT USAGE, SELECT ON SEQUENCE dream_embeddings_id_seq TO service_role;
GRANT USAGE, SELECT ON SEQUENCE dream_embeddings_id_seq TO postgres;

-- Also grant INSERT permissions on the tables
GRANT ALL ON dream_embeddings TO service_role;
GRANT ALL ON dream_themes TO service_role;

-- Check current permissions
SELECT 
  'dream_embeddings' as table_name,
  has_table_privilege('service_role', 'dream_embeddings', 'INSERT') as can_insert,
  has_table_privilege('service_role', 'dream_embeddings', 'SELECT') as can_select,
  has_sequence_privilege('service_role', 'dream_embeddings_id_seq', 'USAGE') as can_use_sequence;

-- Reset the failed jobs to pending so they can be retried
UPDATE embedding_jobs
SET 
  status = 'pending',
  attempts = 0,
  scheduled_at = NOW(),
  error_message = NULL,
  started_at = NULL,
  completed_at = NULL
WHERE status IN ('failed', 'pending');

-- Check updated job status
SELECT 
  status,
  COUNT(*) as count
FROM embedding_jobs
GROUP BY status;