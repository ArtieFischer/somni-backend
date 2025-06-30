-- =====================================================================
-- SCHEMA VALIDATION SCRIPT
-- Run this after applying the initial schema to verify everything is correct
-- =====================================================================

-- Check if all required extensions are installed
SELECT 
  extname, 
  extversion 
FROM pg_extension 
WHERE extname IN ('postgis', 'vector')
ORDER BY extname;

-- Check all custom types
SELECT 
  typname, 
  typtype,
  CASE 
    WHEN typtype = 'e' THEN array_to_string(ARRAY(
      SELECT enumlabel FROM pg_enum 
      WHERE enumtypid = pg_type.oid 
      ORDER BY enumsortorder
    ), ', ')
    ELSE NULL
  END as enum_values
FROM pg_type 
WHERE typnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
  AND typname IN (
    'conversation_status_enum', 
    'loc_accuracy_enum', 
    'sex_enum', 
    'sleep_phase_enum', 
    'transcription_status_enum'
  )
ORDER BY typname;

-- Check all tables exist
SELECT 
  tablename,
  (SELECT COUNT(*) FROM pg_indexes WHERE tablename = t.tablename) as index_count,
  obj_description(c.oid, 'pg_class') as table_comment
FROM pg_tables t
JOIN pg_class c ON c.relname = t.tablename AND c.relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
WHERE schemaname = 'public' 
  AND tablename NOT LIKE 'pg_%'
ORDER BY tablename;

-- Check RLS is enabled on all tables (except embedding_jobs)
SELECT 
  schemaname,
  tablename,
  rowsecurity,
  CASE 
    WHEN tablename = 'embedding_jobs' AND NOT rowsecurity THEN 'OK - RLS disabled for job processing'
    WHEN tablename != 'embedding_jobs' AND rowsecurity THEN 'OK - RLS enabled'
    ELSE 'ERROR - Check RLS configuration'
  END as status
FROM pg_tables
WHERE schemaname = 'public' 
  AND tablename NOT LIKE 'pg_%'
ORDER BY tablename;

-- Check all RLS policies
SELECT 
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual IS NOT NULL as has_using,
  with_check IS NOT NULL as has_with_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- Count policies per table
SELECT 
  tablename,
  COUNT(*) as policy_count,
  string_agg(policyname, ', ' ORDER BY policyname) as policies
FROM pg_policies
WHERE schemaname = 'public'
GROUP BY tablename
ORDER BY tablename;

-- Check all foreign key constraints
SELECT
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS referenced_table,
  ccu.column_name AS referenced_column,
  tc.constraint_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
  AND tc.table_schema = 'public'
ORDER BY tc.table_name, kcu.column_name;

-- Check all functions
SELECT 
  proname as function_name,
  pg_get_function_result(oid) as return_type,
  pg_get_function_arguments(oid) as arguments
FROM pg_proc
WHERE pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
  AND proname NOT LIKE 'pg_%'
ORDER BY proname;

-- Check all triggers
SELECT 
  trigger_schema,
  event_object_table as table_name,
  trigger_name,
  event_manipulation as trigger_event,
  action_timing as trigger_timing,
  action_statement
FROM information_schema.triggers
WHERE trigger_schema = 'public'
ORDER BY event_object_table, trigger_name;

-- Check vector indexes
SELECT 
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND (indexdef LIKE '%USING hnsw%' OR indexdef LIKE '%USING ivfflat%')
ORDER BY tablename, indexname;

-- Check storage buckets
SELECT 
  id as bucket_id,
  name as bucket_name,
  public as is_public,
  created_at
FROM storage.buckets
ORDER BY name;

-- Check realtime subscriptions
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime'
ORDER BY tablename;

-- Summary report
SELECT 'VALIDATION SUMMARY' as report;

SELECT 
  'Tables: ' || COUNT(DISTINCT tablename) || ' tables found' as status
FROM pg_tables 
WHERE schemaname = 'public' AND tablename NOT LIKE 'pg_%'
UNION ALL
SELECT 
  'RLS Policies: ' || COUNT(*) || ' policies defined'
FROM pg_policies WHERE schemaname = 'public'
UNION ALL
SELECT 
  'Indexes: ' || COUNT(*) || ' indexes created'
FROM pg_indexes WHERE schemaname = 'public'
UNION ALL
SELECT 
  'Functions: ' || COUNT(*) || ' functions defined'
FROM pg_proc 
WHERE pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
  AND proname NOT LIKE 'pg_%'
UNION ALL
SELECT 
  'Triggers: ' || COUNT(*) || ' triggers configured'
FROM information_schema.triggers WHERE trigger_schema = 'public';

-- Check for common issues
SELECT 'POTENTIAL ISSUES CHECK' as report;

-- Check for tables without any RLS policies
SELECT 
  'WARNING: Table ' || t.tablename || ' has RLS enabled but no policies defined' as issue
FROM pg_tables t
LEFT JOIN pg_policies p ON t.tablename = p.tablename AND p.schemaname = 'public'
WHERE t.schemaname = 'public' 
  AND t.rowsecurity = true
  AND p.tablename IS NULL
  AND t.tablename != 'embedding_jobs';

-- Check for missing indexes on foreign keys
SELECT 
  'WARNING: Foreign key ' || tc.table_name || '.' || kcu.column_name || 
  ' -> ' || ccu.table_name || ' may need an index' as issue
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' 
  AND tc.table_schema = 'public'
  AND NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE schemaname = 'public' 
      AND tablename = tc.table_name 
      AND indexdef LIKE '%' || kcu.column_name || '%'
  );

-- Final status
SELECT 
  CASE 
    WHEN COUNT(*) = 0 THEN 'VALIDATION PASSED: Schema appears to be correctly configured'
    ELSE 'VALIDATION COMPLETED: Review warnings above'
  END as final_status
FROM (
  SELECT 1 FROM pg_tables t
  LEFT JOIN pg_policies p ON t.tablename = p.tablename AND p.schemaname = 'public'
  WHERE t.schemaname = 'public' 
    AND t.rowsecurity = true
    AND p.tablename IS NULL
    AND t.tablename != 'embedding_jobs'
) warnings;