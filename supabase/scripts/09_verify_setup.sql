-- Step 9: Verify everything was created correctly

-- Check all tables were created
SELECT 
  'Tables Check' as check_type,
  COUNT(*) as found,
  3 as expected
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('dream_embeddings', 'dream_themes', 'embedding_jobs');

-- Check dreams table has new columns
SELECT 
  'Dreams Columns' as check_type,
  COUNT(*) as found,
  5 as expected
FROM information_schema.columns 
WHERE table_name = 'dreams' 
AND column_name IN ('embedding_status', 'embedding_error', 'embedding_attempts', 'embedding_processed_at', 'embedding_started_at');

-- Check dream_themes has required columns
SELECT 
  'Dream Themes Columns' as check_type,
  COUNT(*) as found,
  7 as expected
FROM information_schema.columns 
WHERE table_name = 'dream_themes' 
AND column_name IN ('dream_id', 'theme_code', 'similarity', 'chunk_index', 'extracted_at', 'score', 'explanation');

-- Check functions were created
SELECT 
  'Functions' as check_type,
  COUNT(*) as found,
  3 as expected
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN ('search_similar_dreams', 'get_dream_themes', 'cleanup_stale_embedding_jobs');

-- Check trigger exists
SELECT 
  'Trigger' as check_type,
  COUNT(*) as found,
  1 as expected
FROM information_schema.triggers 
WHERE trigger_name = 'trigger_create_embedding_job';

-- Check RLS is enabled
SELECT 
  'RLS Enabled' as check_type,
  COUNT(*) as tables_with_rls,
  3 as expected
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('dream_embeddings', 'dream_themes', 'embedding_jobs')
AND rowsecurity = true;