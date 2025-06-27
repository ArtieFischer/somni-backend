-- Get the COMPLETE structure of interpreters table with all constraints

-- 1. Show ALL columns with their properties
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default,
    character_maximum_length
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'interpreters'
ORDER BY ordinal_position;

-- 2. Show any existing data to understand the expected format
SELECT * FROM interpreters LIMIT 1;

-- 3. Get column comments that might explain expected values
SELECT 
    a.attname AS column_name,
    pg_catalog.col_description(c.oid, a.attnum) AS column_comment
FROM pg_catalog.pg_class c
JOIN pg_catalog.pg_attribute a ON a.attrelid = c.oid
WHERE c.relname = 'interpreters' 
  AND a.attnum > 0 
  AND NOT a.attisdropped
ORDER BY a.attnum;