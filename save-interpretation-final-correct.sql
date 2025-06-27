-- Save the interpretation with the CORRECT structure

-- 1. Get the user_id for this dream
SELECT user_id FROM dreams WHERE id = '2b56cae5-8a73-4b99-bb83-90d594d26e39';

-- 2. Save the interpretation using the correct column names and structure
INSERT INTO interpretations (
    dream_id,
    user_id,  -- Required field - get from dreams table
    interpreter_type,
    interpretation_summary,
    full_response,
    dream_topic,
    quick_take,
    symbols,
    emotional_tone,
    primary_insight,
    key_pattern,
    knowledge_fragments_used,
    total_fragments_retrieved,
    fragment_ids_used,
    processing_time_ms,
    model_used,
    version
) VALUES (
    '2b56cae5-8a73-4b99-bb83-90d594d26e39',
    (SELECT user_id FROM dreams WHERE id = '2b56cae5-8a73-4b99-bb83-90d594d26e39'),  -- Get user_id from dream
    'freud',
    'Your dream reveals a deep unconscious longing for a return to a state of primal comfort and unity, symbolizing a desire to embrace your instinctual nature.',
    '{
        "condensedInterpretation": "Your dream reveals a deep unconscious longing for a return to a state of primal comfort and unity. The ocean represents the womb or the unconscious mind itself, while your transformation into a fish symbolizes a desire to embrace your instinctual nature and experience effortless existence.",
        "symbols": ["ocean", "fish", "swimming", "water"],
        "emotionalTone": {
            "primary": "longing",
            "secondary": "peace",
            "intensity": 0.7
        },
        "primaryInsight": "A profound unconscious desire for a return to a pre-natal or early childhood state of undifferentiated bliss and unity, coupled with an acceptance of primal instincts.",
        "keyPattern": "Regression to a primordial state and integration of instinctual drives.",
        "selfReflection": "What aspects of your current life feel overly complicated or demanding?",
        "advice": "Consider exploring what aspects of your current life feel overly complicated or demanding. This dream may be encouraging you to reconnect with simpler pleasures and trust your instincts more."
    }'::jsonb,
    'Return to Primordial State and Instinctual Acceptance',
    'Your dream reveals a deep unconscious longing for a return to a state of primal comfort and unity, symbolizing a desire to embrace your instinctual nature and experience effortless existence.',
    ARRAY['ocean', 'fish', 'swimming', 'water'],
    '{
        "primary": "longing",
        "secondary": "peace",
        "intensity": 0.7
    }'::jsonb,
    'A profound unconscious desire for a return to a pre-natal or early childhood state of undifferentiated bliss and unity, coupled with an acceptance of primal instincts.',
    'Regression to a primordial state and integration of instinctual drives.',
    2,
    10,
    ARRAY['cde1d33b-deaa-4d56-bb51-7fdf41d5c264', '4aefea8a-1037-4eaf-a33a-18231a94db7c'],
    23649,
    'gpt-4o',
    1
) 
ON CONFLICT (dream_id, interpreter_type, version) 
DO UPDATE SET
    interpretation_summary = EXCLUDED.interpretation_summary,
    full_response = EXCLUDED.full_response,
    dream_topic = EXCLUDED.dream_topic,
    quick_take = EXCLUDED.quick_take,
    symbols = EXCLUDED.symbols,
    emotional_tone = EXCLUDED.emotional_tone,
    primary_insight = EXCLUDED.primary_insight,
    key_pattern = EXCLUDED.key_pattern,
    updated_at = NOW()
RETURNING id;

-- 3. Update the dream to add interpretation metadata
UPDATE dreams
SET 
    updated_at = NOW()
WHERE id = '2b56cae5-8a73-4b99-bb83-90d594d26e39'
RETURNING id, title, updated_at;

-- 4. Verify the interpretation was saved
SELECT 
    i.id,
    i.dream_id,
    i.interpreter_type,
    int.name as interpreter_name,
    i.dream_topic,
    LEFT(i.interpretation_summary, 100) || '...' as summary_preview,
    i.symbols,
    i.emotional_tone,
    i.created_at
FROM interpretations i
JOIN interpreters int ON i.interpreter_type = int.id
WHERE i.dream_id = '2b56cae5-8a73-4b99-bb83-90d594d26e39';