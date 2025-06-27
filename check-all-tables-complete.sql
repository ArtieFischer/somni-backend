-- Complete check of all tables involved in dream interpretation

-- 1. DREAMS table structure
SELECT '=== DREAMS TABLE ===' as section;
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'dreams'
ORDER BY ordinal_position;

-- 2. INTERPRETERS table structure
SELECT '=== INTERPRETERS TABLE ===' as section;
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'interpreters'
ORDER BY ordinal_position;

-- 3. INTERPRETATIONS table structure (complete)
SELECT '=== INTERPRETATIONS TABLE ===' as section;
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'interpretations'
ORDER BY ordinal_position;

-- 4. Show sample data from interpreters
SELECT '=== SAMPLE INTERPRETERS ===' as section;
SELECT id, name, full_name FROM interpreters LIMIT 5;

-- 5. Show any existing interpretations
SELECT '=== SAMPLE INTERPRETATIONS ===' as section;
SELECT * FROM interpretations LIMIT 2;

-- 6. Check constraints on interpretations table
SELECT '=== INTERPRETATIONS CONSTRAINTS ===' as section;
SELECT 
    conname as constraint_name,
    contype as type,
    pg_get_constraintdef(oid) as definition
FROM pg_constraint
WHERE conrelid = 'interpretations'::regclass;

-- 7. Check if there are any other interpretation-related tables
SELECT '=== OTHER INTERPRETATION TABLES ===' as section;
SELECT 
    table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND (table_name LIKE '%interp%' OR table_name LIKE '%dream%')
  AND table_type = 'BASE TABLE'
ORDER BY table_name;