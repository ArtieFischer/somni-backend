# Fix for "interpreter_id" Column Error

## Problem
The error `column "interpreter_id" does not exist` occurs because there's a mismatch between:
- Initial schema: uses `interpreter_id`
- Current schema documentation: uses `interpreter_type`

## Solution

### Option 1: Quick Fix (Rename Column)
If your database still has `interpreter_id`, rename it to match the documentation:

```sql
-- Check current column name
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'interpretations' 
AND column_name IN ('interpreter_id', 'interpreter_type');

-- If it shows 'interpreter_id', rename it:
ALTER TABLE interpretations 
RENAME COLUMN interpreter_id TO interpreter_type;
```

### Option 2: Create Migration (Recommended)
Create a new migration file:

```bash
# Create migration file
touch supabase/migrations/$(date +%Y%m%d%H%M%S)_rename_interpreter_id_to_type.sql
```

Add this content:
```sql
-- Rename interpreter_id to interpreter_type to match documentation
ALTER TABLE interpretations 
RENAME COLUMN interpreter_id TO interpreter_type;

-- Also update conversations table if it exists
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'conversations' 
        AND column_name = 'interpreter_id'
    ) THEN
        ALTER TABLE conversations 
        RENAME COLUMN interpreter_id TO interpreter_type;
    END IF;
END $$;
```

### Option 3: Update Your Query
If you can't change the database, update your query to use the correct column name:

```sql
-- Change this:
COUNT(DISTINCT interpreter_id) as unique_interpreters

-- To this:
COUNT(DISTINCT interpreter_type) as unique_interpreters
```

## Verification
After fixing, verify the column name:
```sql
-- Check interpretations table
\d interpretations

-- Or query column info
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'interpretations' 
AND column_name LIKE 'interpreter%';
```

## Root Cause
The initial schema (000_initial_schema.sql) created the table with `interpreter_id`, but the application and documentation expect `interpreter_type`. This needs to be synchronized.