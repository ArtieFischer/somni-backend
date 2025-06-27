-- Fix for saving interpretations with the CORRECT table structure

-- 1. First, check the structure of the interpreters table
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'interpreters'
ORDER BY ordinal_position;

-- 2. Check existing interpreters
SELECT * FROM interpreters;

-- 3. Insert interpreters with ALL required fields including full_name
INSERT INTO interpreters (id, name, full_name, description) 
VALUES 
  ('jung', 'Carl Jung', 'Dr. Carl Gustav Jung', 'Analytical psychology approach focusing on archetypes and the collective unconscious'),
  ('freud', 'Sigmund Freud', 'Dr. Sigmund Freud', 'Psychoanalytic approach exploring unconscious desires and childhood connections'),
  ('mary', 'Mary Chen', 'Dr. Mary Chen', 'Neuroscientific approach understanding dreams through brain activity'),
  ('lakshmi', 'Swami Lakshmi', 'Swami Lakshmi Devi', 'Vedantic approach integrating Eastern spiritual wisdom')
ON CONFLICT (id) DO UPDATE SET
  full_name = EXCLUDED.full_name,
  description = EXCLUDED.description;

-- 4. Verify interpreters were created/updated
SELECT id, name, full_name, description FROM interpreters;

-- 5. Now save the interpretation with the CORRECT structure
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
    created_at = NOW();

-- 6. Verify the interpretation was saved
SELECT 
    i.id,
    i.dream_id,
    i.interpreter_id,
    int.name as interpreter_name,
    int.full_name as interpreter_full_name,
    LEFT(i.interpretation, 100) || '...' as interpretation_preview,
    i.key_symbols,
    i.mood_analysis,
    i.created_at
FROM interpretations i
JOIN interpreters int ON i.interpreter_id = int.id
WHERE i.dream_id = '2b56cae5-8a73-4b99-bb83-90d594d26e39';

-- 7. Check all interpretations for this user's dreams
SELECT 
    d.id as dream_id,
    d.title as dream_title,
    i.interpreter_id,
    int.name as interpreter_name,
    i.created_at,
    LENGTH(i.interpretation) as interpretation_length
FROM dreams d
LEFT JOIN interpretations i ON d.id = i.dream_id
LEFT JOIN interpreters int ON i.interpreter_id = int.id
WHERE d.user_id = (
    SELECT user_id FROM dreams WHERE id = '2b56cae5-8a73-4b99-bb83-90d594d26e39'
)
ORDER BY d.created_at DESC, i.created_at DESC
LIMIT 20;