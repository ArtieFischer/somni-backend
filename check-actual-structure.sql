-- Check the ACTUAL structure of the interpretations table

-- 1. Get all columns in interpretations table
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'interpretations'
ORDER BY ordinal_position;

-- 2. Check if there's a 'data' or 'content' column instead
SELECT 
    column_name
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'interpretations'
  AND data_type = 'jsonb';

-- 3. Check a sample of what's actually in the table (if anything)
SELECT * FROM interpretations LIMIT 1;

-- 4. Check the dreams table structure
SELECT 
    column_name,
    data_type
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'dreams'
  AND column_name LIKE '%interp%'
ORDER BY ordinal_position;

-- 5. Find the correct column names for JSON data
SELECT 
    c.column_name,
    c.data_type,
    c.is_nullable
FROM information_schema.columns c
WHERE c.table_name = 'interpretations'
  AND c.table_schema = 'public'
  AND (c.data_type = 'jsonb' OR c.data_type = 'json' OR c.column_name LIKE '%data%' OR c.column_name LIKE '%content%' OR c.column_name LIKE '%result%')
ORDER BY c.ordinal_position;