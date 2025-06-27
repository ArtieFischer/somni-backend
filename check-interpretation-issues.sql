-- SQL Scripts to Check Dream Interpretation Issues
-- Run these in Supabase SQL Editor to diagnose the problem

-- 1. Check if the dream exists and its current status
SELECT 
    id,
    user_id,
    title,
    interpretation_status,
    created_at,
    updated_at,
    transcription_text IS NOT NULL as has_transcription,
    LENGTH(transcription_text) as transcript_length
FROM dreams 
WHERE id = '2b56cae5-8a73-4b99-bb83-90d594d26e39';

-- 2. Check if interpretation was saved to the interpretations table
SELECT 
    id,
    dream_id,
    interpreter_type,
    status,
    created_at,
    updated_at,
    interpretation_data IS NOT NULL as has_data,
    error_message
FROM interpretations 
WHERE dream_id = '2b56cae5-8a73-4b99-bb83-90d594d26e39';

-- 3. Check RLS policies on interpretations table
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'interpretations'
ORDER BY policyname;

-- 4. Check table structure of interpretations
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'interpretations'
ORDER BY ordinal_position;

-- 5. Check if there are any interpretations at all (to see if it's a general issue)
SELECT 
    COUNT(*) as total_interpretations,
    COUNT(DISTINCT dream_id) as unique_dreams,
    COUNT(DISTINCT interpreter_type) as interpreter_types,
    MIN(created_at) as oldest,
    MAX(created_at) as newest
FROM interpretations;

-- 6. Check recent interpretation attempts (last 10)
SELECT 
    i.id,
    i.dream_id,
    i.interpreter_type,
    i.status,
    i.created_at,
    i.error_message,
    d.user_id as dream_user_id
FROM interpretations i
JOIN dreams d ON i.dream_id = d.id
ORDER BY i.created_at DESC
LIMIT 10;

-- 7. Check if the fragments exist that were referenced
SELECT 
    id,
    interpreter_type,
    title,
    is_active,
    created_at
FROM knowledge_fragments
WHERE id IN (
    'cde1d33b-deaa-4d56-bb51-7fdf41d5c264',
    '4aefea8a-1037-4eaf-a33a-18231a94db7c'
);

-- 8. Check for any triggers on interpretations table
SELECT 
    trigger_name,
    event_manipulation,
    event_object_table,
    action_statement
FROM information_schema.triggers
WHERE event_object_table = 'interpretations';

-- 9. Check service role capabilities (run this to see what the service role can do)
SELECT 
    has_table_privilege('service_role', 'public.interpretations', 'INSERT') as can_insert,
    has_table_privilege('service_role', 'public.interpretations', 'UPDATE') as can_update,
    has_table_privilege('service_role', 'public.interpretations', 'SELECT') as can_select,
    has_table_privilege('service_role', 'public.interpretations', 'DELETE') as can_delete;

-- 10. Check for any functions that might be interfering
SELECT 
    proname as function_name,
    proargnames as arguments,
    prosrc as source_code
FROM pg_proc
WHERE proname LIKE '%interpretation%'
   OR prosrc LIKE '%interpretations%'
LIMIT 10;

-- 11. Try to manually insert a test interpretation (to check permissions)
-- IMPORTANT: Comment this out if you don't want to create test data
/*
INSERT INTO interpretations (
    dream_id,
    interpreter_type,
    status,
    interpretation_data,
    created_at,
    updated_at
) VALUES (
    '2b56cae5-8a73-4b99-bb83-90d594d26e39',
    'test_manual',
    'completed',
    '{"test": "manual insert"}',
    NOW(),
    NOW()
) RETURNING id, dream_id, interpreter_type, status;
*/

-- 12. Check if there are any database rules or constraints
SELECT 
    conname as constraint_name,
    contype as constraint_type,
    conrelid::regclass as table_name,
    pg_get_constraintdef(oid) as definition
FROM pg_constraint
WHERE conrelid = 'interpretations'::regclass;

-- 13. Check the exact error by looking at Postgres logs (if available)
-- This might not work in Supabase UI but worth trying
/*
SELECT 
    log_time,
    user_name,
    database_name,
    process_id,
    connection_from,
    session_id,
    session_line_num,
    command_tag,
    session_start_time,
    virtual_transaction_id,
    transaction_id,
    error_severity,
    sql_state_code,
    message,
    detail,
    hint,
    query
FROM postgres_log
WHERE log_time > NOW() - INTERVAL '1 hour'
  AND (message LIKE '%interpretation%' OR query LIKE '%interpretation%')
ORDER BY log_time DESC
LIMIT 20;
*/