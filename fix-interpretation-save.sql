-- Fix for saving interpretations with the CORRECT table structure

-- 1. First, check what's in the interpreters table (to get the correct interpreter_id)
SELECT id, name, description 
FROM interpreters;

-- 2. Check if 'freud' exists as an interpreter
SELECT * FROM interpreters 
WHERE id = 'freud' OR name ILIKE '%freud%';

-- 3. Insert interpreters if they don't exist
INSERT INTO interpreters (id, name, description) 
VALUES 
  ('jung', 'Carl Jung', 'Analytical psychology approach focusing on archetypes and the collective unconscious'),
  ('freud', 'Sigmund Freud', 'Psychoanalytic approach exploring unconscious desires and childhood connections'),
  ('mary', 'Mary Chen', 'Neuroscientific approach understanding dreams through brain activity'),
  ('lakshmi', 'Swami Lakshmi Devi', 'Vedantic approach integrating Eastern spiritual wisdom')
ON CONFLICT (id) DO NOTHING;

-- 4. Now save the interpretation with the CORRECT structure
-- Based on your logs, here's how to save that Freud interpretation:
INSERT INTO interpretations (
    dream_id,
    interpreter_id,  -- NOT interpreter_type!
    interpretation,  -- This is a STRING, not JSONB
    advice,
    key_symbols,
    mood_analysis,
    version,
    created_at
) VALUES (
    '2b56cae5-8a73-4b99-bb83-90d594d26e39',
    'freud',  -- This must match an id in the interpreters table
    'Your dream reveals a deep unconscious longing for a return to a state of primal comfort and unity. The ocean represents the womb or the unconscious mind itself, while your transformation into a fish symbolizes a desire to embrace your instinctual nature and experience effortless existence. This reflects a profound unconscious desire for a return to a pre-natal or early childhood state of undifferentiated bliss and unity, coupled with an acceptance of primal instincts.',
    'Consider exploring what aspects of your current life feel overly complicated or demanding. This dream may be encouraging you to reconnect with simpler pleasures and trust your instincts more.',
    '["ocean", "fish", "swimming", "water"]'::jsonb,
    '{
        "primary": "longing",
        "secondary": "peace", 
        "intensity": 0.7
    }'::jsonb,
    1,  -- version number
    NOW()
) 
ON CONFLICT (dream_id, interpreter_id, version) 
DO UPDATE SET
    interpretation = EXCLUDED.interpretation,
    advice = EXCLUDED.advice,
    key_symbols = EXCLUDED.key_symbols,
    mood_analysis = EXCLUDED.mood_analysis;

-- 5. Verify it was saved
SELECT 
    i.id,
    i.dream_id,
    i.interpreter_id,
    int.name as interpreter_name,
    LEFT(i.interpretation, 100) || '...' as interpretation_preview,
    i.key_symbols,
    i.mood_analysis,
    i.created_at
FROM interpretations i
JOIN interpreters int ON i.interpreter_id = int.id
WHERE i.dream_id = '2b56cae5-8a73-4b99-bb83-90d594d26e39';

-- 6. Check the unique constraint
SELECT 
    conname,
    pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid = 'interpretations'::regclass
  AND contype = 'u';

-- The unique constraint is on (dream_id, interpreter_id, version)
-- This means you can have multiple versions of interpretations for the same dream/interpreter pair