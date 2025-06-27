-- Fix for "column interpreter_id does not exist" error

-- 1. First, check what column name actually exists in your database
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'interpretations' 
AND column_name LIKE 'interpreter%';

-- 2. Check if there are any views using the wrong column name
SELECT 
    viewname,
    definition 
FROM pg_views 
WHERE definition LIKE '%interpreter_id%';

-- 3. Check for any functions using the wrong column name
SELECT 
    proname AS function_name,
    prosrc AS function_source
FROM pg_proc
WHERE prosrc LIKE '%interpreter_id%'
    AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');

-- 4. If you find the problematic query, update it from:
-- COUNT(DISTINCT interpreter_id) as unique_interpreters
-- To:
-- COUNT(DISTINCT interpreter_type) as unique_interpreters

-- 5. Example of the corrected query that should work:
SELECT 
    COUNT(*) as total_count,
    COUNT(DISTINCT dream_id) as unique_dreams,
    COUNT(DISTINCT interpreter_type) as unique_interpreters,  -- Changed from interpreter_id
    MAX(created_at) as most_recent
FROM interpretations;

-- 6. If you need to update a view, drop and recreate it:
-- DROP VIEW IF EXISTS your_view_name;
-- CREATE VIEW your_view_name AS
-- SELECT ... (with corrected column names)

-- 7. If the column is actually named interpreter_id in your database,
-- you should rename it to match the documentation:
-- ALTER TABLE interpretations RENAME COLUMN interpreter_id TO interpreter_type;

-- 8. Alternative: If you can't change the database, update your application code
-- to use interpreter_id instead of interpreter_type