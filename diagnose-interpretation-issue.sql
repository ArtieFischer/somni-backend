-- DIAGNOSIS: The interpretation is being generated successfully but NOT saved to the database
-- The backend code is missing the database save operation

-- 1. Verify the interpretations table exists and structure
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'interpretations'
ORDER BY ordinal_position;

-- 2. Check if ANY interpretations have been saved (should be empty or very few)
SELECT 
    COUNT(*) as total_count,
    COUNT(DISTINCT dream_id) as unique_dreams,
    COUNT(DISTINCT interpreter_type) as unique_interpreters,
    MAX(created_at) as most_recent
FROM interpretations;

-- 3. Create the interpretations table if it doesn't exist
-- (Run this ONLY if the table doesn't exist from query #1)
/*
CREATE TABLE IF NOT EXISTS interpretations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    dream_id UUID NOT NULL REFERENCES dreams(id) ON DELETE CASCADE,
    interpreter_type TEXT NOT NULL,
    interpretation_data JSONB NOT NULL,
    status TEXT DEFAULT 'completed',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    error_message TEXT,
    processing_time_ms INTEGER,
    model_used TEXT,
    user_id UUID REFERENCES auth.users(id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_interpretations_dream_id ON interpretations(dream_id);
CREATE INDEX IF NOT EXISTS idx_interpretations_user_id ON interpretations(user_id);
CREATE INDEX IF NOT EXISTS idx_interpretations_created_at ON interpretations(created_at DESC);

-- Enable RLS
ALTER TABLE interpretations ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own interpretations" ON interpretations
    FOR SELECT USING (
        dream_id IN (SELECT id FROM dreams WHERE user_id = auth.uid())
    );

CREATE POLICY "Service role can do everything" ON interpretations
    FOR ALL USING (auth.role() = 'service_role');
*/

-- 4. Manually insert the interpretation that was generated (as a temporary fix)
-- Replace the values with the actual data from your logs
/*
INSERT INTO interpretations (
    dream_id,
    interpreter_type,
    interpretation_data,
    status,
    processing_time_ms,
    model_used,
    created_at,
    updated_at
) VALUES (
    '2b56cae5-8a73-4b99-bb83-90d594d26e39',
    'freud', -- or whatever interpreter was used
    '{
        "dream_topic": "Return to Primordial State and Instinctual Acceptance",
        "quick_take": "Your dream reveals a deep unconscious longing for a return to a state of primal comfort and unity, symbolizing a desire to embrace your instinctual nature and experience effortless existence.",
        "symbols": ["ocean", "fish", "swimming", "water"],
        "emotional_tone": {
            "primary": "longing",
            "secondary": "peace",
            "intensity": 0.7
        },
        "primary_insight": "A profound unconscious desire for a return to a pre-natal or early childhood state of undifferentiated bliss and unity, coupled with an acceptance of primal instincts.",
        "key_pattern": "Regression to a primordial state and integration of instinctual drives.",
        "knowledge_fragments_used": 2,
        "total_fragments_retrieved": 10,
        "fragment_ids_used": [
            "cde1d33b-deaa-4d56-bb51-7fdf41d5c264",
            "4aefea8a-1037-4eaf-a33a-18231a94db7c"
        ]
    }'::jsonb,
    'completed',
    23649,
    'gpt-4o',
    NOW(),
    NOW()
);
*/

-- 5. Check if there's a unique constraint preventing saves
SELECT 
    conname as constraint_name,
    pg_get_constraintdef(oid) as definition
FROM pg_constraint
WHERE conrelid = 'interpretations'::regclass
  AND contype IN ('u', 'p'); -- unique and primary key constraints

-- 6. Test if service role can insert (this simulates what your backend should do)
/*
SET ROLE postgres; -- or use 'service_role' if that's what your backend uses
INSERT INTO interpretations (
    dream_id,
    interpreter_type,
    interpretation_data,
    status
) VALUES (
    '2b56cae5-8a73-4b99-bb83-90d594d26e39',
    'test_insert',
    '{"test": true}'::jsonb,
    'test'
) RETURNING id;
RESET ROLE;
*/