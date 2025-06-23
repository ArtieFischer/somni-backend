-- Check current state and fix interpreter column

-- Step 1: Check what columns we actually have
DO $$
DECLARE
    has_author BOOLEAN;
    has_interpreter BOOLEAN;
    col_list TEXT;
BEGIN
    -- Check for author column
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'knowledge_fragments' 
        AND column_name = 'author'
        AND table_schema = 'public'
    ) INTO has_author;
    
    -- Check for interpreter column
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'knowledge_fragments' 
        AND column_name = 'interpreter'
        AND table_schema = 'public'
    ) INTO has_interpreter;
    
    -- Get list of all columns
    SELECT string_agg(column_name, ', ' ORDER BY ordinal_position) 
    INTO col_list
    FROM information_schema.columns 
    WHERE table_name = 'knowledge_fragments' 
    AND table_schema = 'public';
    
    RAISE NOTICE 'Current columns in knowledge_fragments: %', col_list;
    RAISE NOTICE 'Has author column: %', has_author;
    RAISE NOTICE 'Has interpreter column: %', has_interpreter;
END $$;

-- Step 2: Add interpreter column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'knowledge_fragments' 
        AND column_name = 'interpreter'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE knowledge_fragments ADD COLUMN interpreter TEXT;
        RAISE NOTICE 'Added interpreter column';
    END IF;
END $$;

-- Step 3: Populate interpreter column for existing Jung content
UPDATE knowledge_fragments 
SET interpreter = 'jung' 
WHERE interpreter IS NULL OR interpreter = '';

-- Step 4: Make interpreter NOT NULL
ALTER TABLE knowledge_fragments 
ALTER COLUMN interpreter SET NOT NULL;

-- Step 5: Create index for performance
CREATE INDEX IF NOT EXISTS idx_knowledge_fragments_interpreter 
ON knowledge_fragments(interpreter);

-- Step 6: Final verification
DO $$
DECLARE
    total_count INTEGER;
    jung_count INTEGER;
    null_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO total_count FROM knowledge_fragments;
    SELECT COUNT(*) INTO jung_count FROM knowledge_fragments WHERE interpreter = 'jung';
    SELECT COUNT(*) INTO null_count FROM knowledge_fragments WHERE interpreter IS NULL;
    
    RAISE NOTICE '✅ Total fragments: %', total_count;
    RAISE NOTICE '✅ Jung fragments: %', jung_count;
    RAISE NOTICE '✅ Null interpreters: %', null_count;
END $$;