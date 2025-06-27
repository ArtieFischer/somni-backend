-- Check the EXACT structure of interpretations table

-- 1. List ALL columns in interpretations table
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'interpretations'
ORDER BY ordinal_position;

-- 2. Check for any column that might reference interpreters
SELECT 
    column_name
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'interpretations'
  AND (column_name LIKE '%interpreter%' OR column_name LIKE '%interp%');