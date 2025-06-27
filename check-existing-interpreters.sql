-- Check what's already in the interpreters table

-- 1. Show all existing interpreters
SELECT * FROM interpreters;

-- 2. Count how many interpreters exist
SELECT COUNT(*) as interpreter_count FROM interpreters;

-- 3. Check specific interpreters we need
SELECT id, name, full_name, interpretation_style 
FROM interpreters 
WHERE id IN ('jung', 'freud', 'mary', 'lakshmi');

-- 4. If interpreters exist, let's just save the interpretation
-- First check if the interpretation already exists
SELECT 
    i.*,
    int.name as interpreter_name
FROM interpretations i
JOIN interpreters int ON i.interpreter_id = int.id
WHERE i.dream_id = '2b56cae5-8a73-4b99-bb83-90d594d26e39';

-- 5. If no interpretation exists, save it
INSERT INTO interpretations (
    dream_id,
    interpreter_id,
    interpretation,
    advice,
    key_symbols,
    mood_analysis,
    version,
    created_at
) VALUES (
    '2b56cae5-8a73-4b99-bb83-90d594d26e39',
    'freud',
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
ON CONFLICT (dream_id, interpreter_id, version) 
DO UPDATE SET
    interpretation = EXCLUDED.interpretation,
    advice = EXCLUDED.advice,
    key_symbols = EXCLUDED.key_symbols,
    mood_analysis = EXCLUDED.mood_analysis,
    created_at = NOW()
RETURNING id;

-- 6. Update the dream to indicate it has an interpretation
UPDATE dreams
SET 
    has_interpretation = true,
    last_interpreted_at = NOW()
WHERE id = '2b56cae5-8a73-4b99-bb83-90d594d26e39'
RETURNING id, title, has_interpretation, last_interpreted_at;