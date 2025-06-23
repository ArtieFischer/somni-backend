-- Populate empty author fields and rename to interpreter

-- Step 1: First, let's check what we have
DO $$
DECLARE
    total_count INTEGER;
    jung_count INTEGER;
    empty_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO total_count FROM knowledge_fragments;
    SELECT COUNT(*) INTO jung_count FROM knowledge_fragments WHERE author = 'jung';
    SELECT COUNT(*) INTO empty_count FROM knowledge_fragments WHERE author IS NULL OR author = '';
    
    RAISE NOTICE 'Total fragments: %', total_count;
    RAISE NOTICE 'Fragments with author=jung: %', jung_count;
    RAISE NOTICE 'Fragments with empty author: %', empty_count;
END $$;

-- Step 2: Update all existing fragments to have author='jung' 
-- (since all current content is Jung's)
UPDATE knowledge_fragments 
SET author = 'jung' 
WHERE author IS NULL OR author = '';

-- Step 3: Verify the update
DO $$
DECLARE
    updated_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO updated_count FROM knowledge_fragments WHERE author = 'jung';
    RAISE NOTICE 'Fragments now marked as jung: %', updated_count;
END $$;

-- Step 4: Now rename the column
ALTER TABLE knowledge_fragments 
RENAME COLUMN author TO interpreter;

-- Step 5: Add a NOT NULL constraint to prevent empty values in the future
ALTER TABLE knowledge_fragments 
ALTER COLUMN interpreter SET NOT NULL;

-- Step 6: Create an index on interpreter for better query performance
CREATE INDEX IF NOT EXISTS idx_knowledge_fragments_interpreter 
ON knowledge_fragments(interpreter);

-- Step 7: Final verification
DO $$
DECLARE
    jung_final INTEGER;
    has_interpreter_col BOOLEAN;
BEGIN
    -- Check column exists
    SELECT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'knowledge_fragments' 
        AND column_name = 'interpreter'
        AND table_schema = 'public'
    ) INTO has_interpreter_col;
    
    IF has_interpreter_col THEN
        SELECT COUNT(*) INTO jung_final FROM knowledge_fragments WHERE interpreter = 'jung';
        RAISE NOTICE '✅ Success: Column renamed to interpreter';
        RAISE NOTICE '✅ Jung fragments: %', jung_final;
    ELSE
        RAISE EXCEPTION '❌ Failed: Column rename did not complete';
    END IF;
END $$;