-- Save the interpretation with the CORRECT column names

-- 1. First, let's see the complete structure of interpretations table
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'interpretations'
ORDER BY ordinal_position;

-- 2. Check if interpretation already exists
SELECT * FROM interpretations 
WHERE dream_id = '2b56cae5-8a73-4b99-bb83-90d594d26e39'
  AND interpreter_type = 'freud';

-- 3. Save the interpretation using the correct column names
-- Note: interpreter_type is used, not interpreter_id
-- Note: interpretation_summary might be used instead of interpretation
INSERT INTO interpretations (
    dream_id,
    interpreter_type,  -- This is the correct column name
    interpretation,    -- or interpretation_summary if that's the column name
    advice,
    key_symbols,
    mood_analysis,
    version,
    created_at
) VALUES (
    '2b56cae5-8a73-4b99-bb83-90d594d26e39',
    'freud',  -- This should match the interpreter type
    'Your dream reveals a deep unconscious longing for a return to a state of primal comfort and unity. The ocean represents the womb or the unconscious mind itself, while your transformation into a fish symbolizes a desire to embrace your instinctual nature and experience effortless existence. This reflects a profound unconscious desire for a return to a pre-natal or early childhood state of undifferentiated bliss and unity, coupled with an acceptance of primal instincts.',
    'Consider exploring what aspects of your current life feel overly complicated or demanding. This dream may be encouraging you to reconnect with simpler pleasures and trust your instincts more.',
    '["ocean", "fish", "swimming", "water"]'::jsonb,
    '{
        "primary": "longing",
        "secondary": "peace", 
        "intensity": 0.7
    }'::jsonb,
    1,
    NOW()
) 
ON CONFLICT (dream_id, interpreter_type, version) 
DO UPDATE SET
    interpretation = EXCLUDED.interpretation,
    advice = EXCLUDED.advice,
    key_symbols = EXCLUDED.key_symbols,
    mood_analysis = EXCLUDED.mood_analysis,
    created_at = NOW()
RETURNING id;

-- 4. If the above fails because 'interpretation' column doesn't exist, try with 'interpretation_summary'
-- Uncomment and run this if needed:
/*
INSERT INTO interpretations (
    dream_id,
    interpreter_type,
    interpretation_summary,  -- Using the correct column name
    advice,
    key_symbols,
    mood_analysis,
    version,
    created_at
) VALUES (
    '2b56cae5-8a73-4b99-bb83-90d594d26e39',
    'freud',
    'Your dream reveals a deep unconscious longing for a return to a state of primal comfort and unity. The ocean represents the womb or the unconscious mind itself, while your transformation into a fish symbolizes a desire to embrace your instinctual nature and experience effortless existence.',
    'Consider exploring what aspects of your current life feel overly complicated or demanding. This dream may be encouraging you to reconnect with simpler pleasures and trust your instincts more.',
    '["ocean", "fish", "swimming", "water"]'::jsonb,
    '{
        "primary": "longing",
        "secondary": "peace", 
        "intensity": 0.7
    }'::jsonb,
    1,
    NOW()
) 
ON CONFLICT (dream_id, interpreter_type, version) 
DO UPDATE SET
    interpretation_summary = EXCLUDED.interpretation_summary,
    advice = EXCLUDED.advice,
    key_symbols = EXCLUDED.key_symbols,
    mood_analysis = EXCLUDED.mood_analysis,
    created_at = NOW()
RETURNING id;
*/

-- 5. Update the dream to indicate it has an interpretation
UPDATE dreams
SET 
    has_interpretation = true,
    last_interpreted_at = NOW()
WHERE id = '2b56cae5-8a73-4b99-bb83-90d594d26e39'
RETURNING id, title, has_interpretation, last_interpreted_at;

-- 6. Verify what was saved
SELECT * FROM interpretations 
WHERE dream_id = '2b56cae5-8a73-4b99-bb83-90d594d26e39';