-- Rename author column to interpreter in knowledge_fragments table
-- This better reflects the purpose: jung, lakshmi, freud, mary, etc.

-- Step 1: Rename the column
ALTER TABLE knowledge_fragments 
RENAME COLUMN author TO interpreter;

-- Step 2: Update any indexes that might reference this column
-- (PostgreSQL automatically updates indexes when renaming columns)

-- Step 3: Verify the change
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'knowledge_fragments' 
        AND column_name = 'interpreter'
        AND table_schema = 'public'
    ) THEN
        RAISE NOTICE 'Success: Column renamed from author to interpreter';
    ELSE
        RAISE EXCEPTION 'Failed: Column rename did not complete';
    END IF;
END $$;

-- Step 4: Update any functions that might use the author column
-- Check if search functions need updating
DO $$
DECLARE
    func_count INTEGER;
BEGIN
    -- Count functions that might reference 'author'
    SELECT COUNT(*) INTO func_count
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
    AND p.prosrc LIKE '%author%'
    AND p.prosrc LIKE '%knowledge_fragments%';
    
    IF func_count > 0 THEN
        RAISE NOTICE 'WARNING: Found % functions that may reference the old "author" column. Please review and update them.', func_count;
    END IF;
END $$;