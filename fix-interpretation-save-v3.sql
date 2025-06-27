-- Fix for saving interpretations with ALL required fields

-- 1. First, check the COMPLETE structure of the interpreters table
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'interpreters'
ORDER BY ordinal_position;

-- 2. Check if we can see what's already in the interpreters table
SELECT * FROM interpreters LIMIT 1;

-- 3. Insert interpreters with ALL required fields including image_url
-- Using placeholder images for now - you can update these later with actual images
INSERT INTO interpreters (id, name, full_name, description, image_url) 
VALUES 
  (
    'jung', 
    'Carl Jung', 
    'Dr. Carl Gustav Jung', 
    'Analytical psychology approach focusing on archetypes and the collective unconscious',
    'https://via.placeholder.com/400x400/4A90E2/FFFFFF?text=Carl+Jung'
  ),
  (
    'freud', 
    'Sigmund Freud', 
    'Dr. Sigmund Freud', 
    'Psychoanalytic approach exploring unconscious desires and childhood connections',
    'https://via.placeholder.com/400x400/E24A4A/FFFFFF?text=Sigmund+Freud'
  ),
  (
    'mary', 
    'Mary Chen', 
    'Dr. Mary Chen', 
    'Neuroscientific approach understanding dreams through brain activity',
    'https://via.placeholder.com/400x400/4AE290/FFFFFF?text=Mary+Chen'
  ),
  (
    'lakshmi', 
    'Swami Lakshmi', 
    'Swami Lakshmi Devi', 
    'Vedantic approach integrating Eastern spiritual wisdom',
    'https://via.placeholder.com/400x400/E2904A/FFFFFF?text=Swami+Lakshmi'
  )
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  full_name = EXCLUDED.full_name,
  description = EXCLUDED.description,
  image_url = EXCLUDED.image_url;

-- 4. Verify interpreters were created/updated
SELECT id, name, full_name, image_url FROM interpreters;

-- 5. Now save the interpretation
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
    LEFT(i.interpretation, 100) || '...' as interpretation_preview,
    i.key_symbols,
    i.mood_analysis,
    i.created_at
FROM interpretations i
JOIN interpreters int ON i.interpreter_id = int.id
WHERE i.dream_id = '2b56cae5-8a73-4b99-bb83-90d594d26e39';

-- 7. Update the dream to indicate it has an interpretation
UPDATE dreams
SET 
    has_interpretation = true,
    last_interpreted_at = NOW()
WHERE id = '2b56cae5-8a73-4b99-bb83-90d594d26e39';

-- 8. Verify the dream was updated
SELECT 
    id,
    title,
    has_interpretation,
    last_interpreted_at
FROM dreams
WHERE id = '2b56cae5-8a73-4b99-bb83-90d594d26e39';