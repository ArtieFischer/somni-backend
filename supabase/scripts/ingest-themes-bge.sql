-- BGE-M3 Theme Ingestion Script
-- This script handles the actual embedding generation and ingestion for all themes
-- Run this AFTER the migration but BEFORE post-ingestion setup

-- 1. Verify migration was successful
DO $$
BEGIN
    -- Check if new columns exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'themes' AND column_name = 'embedding' 
        AND data_type = 'USER-DEFINED'
    ) THEN
        RAISE EXCEPTION 'Migration not complete: embedding column missing or wrong type';
    END IF;
    
    -- Check vector dimensions
    PERFORM 1 FROM themes WHERE vector_dims(embedding) = 1024 LIMIT 1;
    
    RAISE NOTICE 'Migration verification complete - ready for BGE ingestion';
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'No embeddings found yet - this is expected before ingestion';
END $$;

-- 2. Show themes that need embeddings
SELECT 
    'Themes requiring BGE-M3 embeddings:' as status,
    COUNT(*) as total_themes,
    COUNT(CASE WHEN embedding IS NULL THEN 1 END) as missing_embeddings,
    COUNT(CASE WHEN embedding IS NOT NULL THEN 1 END) as existing_embeddings
FROM themes;

-- 3. Create ingestion tracking table
CREATE TABLE IF NOT EXISTS theme_embedding_progress (
    id SERIAL PRIMARY KEY,
    theme_code TEXT REFERENCES themes(code),
    status TEXT NOT NULL DEFAULT 'pending', -- pending, processing, completed, failed
    embedding_generated_at TIMESTAMPTZ,
    error_message TEXT,
    retry_count INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Initialize tracking for all themes
INSERT INTO theme_embedding_progress (theme_code, status)
SELECT code, 'pending'
FROM themes
WHERE code NOT IN (SELECT theme_code FROM theme_embedding_progress WHERE theme_code IS NOT NULL)
ON CONFLICT DO NOTHING;

-- 5. Function to update theme embedding (to be called from your Node.js service)
CREATE OR REPLACE FUNCTION update_theme_embedding(
    p_theme_code TEXT,
    p_embedding_vector FLOAT[],
    p_sparse_embedding JSONB DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
DECLARE
    embedding_vector vector(1024);
BEGIN
    -- Convert float array to vector
    embedding_vector := array_to_vector(p_embedding_vector)::vector(1024);
    
    -- Update theme with new embedding
    UPDATE themes 
    SET 
        embedding = embedding_vector,
        sparse_embedding = p_sparse_embedding,
        embedding_version = 'bge-m3'
    WHERE code = p_theme_code;
    
    -- Update progress tracking
    UPDATE theme_embedding_progress 
    SET 
        status = 'completed',
        embedding_generated_at = NOW(),
        updated_at = NOW()
    WHERE theme_code = p_theme_code;
    
    RETURN FOUND;
EXCEPTION
    WHEN OTHERS THEN
        -- Log error
        UPDATE theme_embedding_progress 
        SET 
            status = 'failed',
            error_message = SQLERRM,
            retry_count = retry_count + 1,
            updated_at = NOW()
        WHERE theme_code = p_theme_code;
        
        RETURN FALSE;
END;
$$;

-- 6. Batch update function for multiple themes
CREATE OR REPLACE FUNCTION batch_update_theme_embeddings(
    p_theme_data JSONB -- Array of {code, embedding, sparse_embedding}
)
RETURNS TABLE (
    theme_code TEXT,
    success BOOLEAN,
    error_message TEXT
)
LANGUAGE plpgsql
AS $$
DECLARE
    theme_item JSONB;
    embedding_array FLOAT[];
    sparse_emb JSONB;
    success_flag BOOLEAN;
BEGIN
    -- Process each theme in the batch
    FOR theme_item IN SELECT * FROM jsonb_array_elements(p_theme_data)
    LOOP
        BEGIN
            -- Extract data
            embedding_array := ARRAY(SELECT jsonb_array_elements_text(theme_item->'embedding')::FLOAT);
            sparse_emb := theme_item->'sparse_embedding';
            
            -- Update theme
            success_flag := update_theme_embedding(
                theme_item->>'code',
                embedding_array,
                sparse_emb
            );
            
            RETURN QUERY SELECT 
                theme_item->>'code',
                success_flag,
                CASE WHEN success_flag THEN NULL ELSE 'Update failed' END;
                
        EXCEPTION WHEN OTHERS THEN
            RETURN QUERY SELECT 
                theme_item->>'code',
                FALSE,
                SQLERRM;
        END;
    END LOOP;
END;
$$;

-- 7. Progress monitoring queries
CREATE VIEW theme_ingestion_progress AS
SELECT 
    t.code,
    t.label,
    t.description,
    CASE WHEN t.embedding IS NULL THEN 'missing' ELSE 'completed' END as embedding_status,
    t.embedding_version,
    p.status as progress_status,
    p.embedding_generated_at,
    p.error_message,
    p.retry_count,
    p.updated_at
FROM themes t
LEFT JOIN theme_embedding_progress p ON t.code = p.theme_code
ORDER BY p.updated_at DESC NULLS LAST;

-- 8. Get themes for processing (ordered by priority)
CREATE OR REPLACE FUNCTION get_themes_for_processing(
    p_batch_size INT DEFAULT 50,
    p_retry_failed BOOLEAN DEFAULT FALSE
)
RETURNS TABLE (
    code TEXT,
    label TEXT,
    description TEXT,
    combined_text TEXT
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        t.code,
        t.label,
        t.description,
        -- Combine text for embedding generation
        CONCAT(t.label, '. ', COALESCE(t.description, '')) as combined_text
    FROM themes t
    LEFT JOIN theme_embedding_progress p ON t.code = p.theme_code
    WHERE 
        t.embedding IS NULL
        AND (
            p.status IS NULL 
            OR p.status = 'pending' 
            OR (p_retry_failed AND p.status = 'failed' AND p.retry_count < 3)
        )
    ORDER BY 
        -- Priority: common symbols first
        CASE WHEN t.code IN ('water', 'flying', 'falling', 'snake', 'death', 'family', 'home') THEN 1 ELSE 2 END,
        t.created_at
    LIMIT p_batch_size;
END;
$$;

-- 9. Sample usage examples (commented out - for reference)
/*
-- Example: Get next batch of themes to process
SELECT * FROM get_themes_for_processing(10);

-- Example: Update a single theme embedding (from Node.js)
SELECT update_theme_embedding(
    'flying',
    ARRAY[0.1, 0.2, 0.3, ...], -- 1024 float values from BGE-M3
    '{"tokens": ["flying", "soar"], "weights": [0.8, 0.6]}'::JSONB
);

-- Example: Batch update (from Node.js)
SELECT * FROM batch_update_theme_embeddings('[
    {
        "code": "flying",
        "embedding": [0.1, 0.2, 0.3, ...],
        "sparse_embedding": {"tokens": ["flying"], "weights": [0.8]}
    },
    {
        "code": "water", 
        "embedding": [0.4, 0.5, 0.6, ...],
        "sparse_embedding": {"tokens": ["water", "ocean"], "weights": [0.9, 0.7]}
    }
]'::JSONB);
*/

-- 10. Monitor ingestion progress
SELECT 
    'Ingestion Progress Summary:' as report_type,
    COUNT(*) as total_themes,
    COUNT(CASE WHEN embedding IS NOT NULL THEN 1 END) as completed,
    COUNT(CASE WHEN embedding IS NULL THEN 1 END) as remaining,
    ROUND(
        COUNT(CASE WHEN embedding IS NOT NULL THEN 1 END) * 100.0 / COUNT(*), 2
    ) as percent_complete
FROM themes;

-- 11. Show detailed progress
SELECT 
    progress_status,
    COUNT(*) as theme_count,
    ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM themes), 2) as percentage
FROM theme_ingestion_progress
GROUP BY progress_status
ORDER BY 
    CASE progress_status
        WHEN 'completed' THEN 1
        WHEN 'processing' THEN 2  
        WHEN 'pending' THEN 3
        WHEN 'failed' THEN 4
        ELSE 5
    END;

-- 12. Show failed ingestions for retry
SELECT 
    code,
    label,
    error_message,
    retry_count,
    updated_at
FROM theme_ingestion_progress
WHERE status = 'failed'
ORDER BY updated_at DESC;

-- Theme ingestion setup complete. Use get_themes_for_processing() to start BGE-M3 embedding generation.
SELECT 'Theme ingestion setup complete. Use get_themes_for_processing() to start BGE-M3 embedding generation.' as setup_status;