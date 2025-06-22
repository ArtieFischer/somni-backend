-- BGE-M3 Theme Ingestion Setup (Dashboard-friendly version)
-- Copy and paste this into your Supabase SQL editor

-- 1. Create ingestion tracking table
CREATE TABLE IF NOT EXISTS theme_embedding_progress (
    id SERIAL PRIMARY KEY,
    theme_code TEXT REFERENCES themes(code),
    status TEXT NOT NULL DEFAULT 'pending',
    embedding_generated_at TIMESTAMPTZ,
    error_message TEXT,
    retry_count INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Add unique constraint for theme_code
CREATE UNIQUE INDEX IF NOT EXISTS idx_theme_embedding_progress_code 
ON theme_embedding_progress(theme_code);

-- 3. Simple function to update theme embedding
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
    INSERT INTO theme_embedding_progress (theme_code, status, embedding_generated_at, updated_at)
    VALUES (p_theme_code, 'completed', NOW(), NOW())
    ON CONFLICT (theme_code) 
    DO UPDATE SET 
        status = 'completed',
        embedding_generated_at = NOW(),
        updated_at = NOW();
    
    RETURN FOUND;
EXCEPTION
    WHEN OTHERS THEN
        -- Log error
        INSERT INTO theme_embedding_progress (theme_code, status, error_message, retry_count, updated_at)
        VALUES (p_theme_code, 'failed', SQLERRM, 1, NOW())
        ON CONFLICT (theme_code) 
        DO UPDATE SET 
            status = 'failed',
            error_message = SQLERRM,
            retry_count = theme_embedding_progress.retry_count + 1,
            updated_at = NOW();
        
        RETURN FALSE;
END;
$$;

-- 4. Function to get themes for processing
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
        CASE WHEN t.code IN ('water', 'flying', 'falling', 'snake', 'death', 'family', 'home') THEN 1 ELSE 2 END,
        t.created_at
    LIMIT p_batch_size;
END;
$$;

-- 5. Initialize tracking for all existing themes
INSERT INTO theme_embedding_progress (theme_code, status)
SELECT code, 'pending'
FROM themes
WHERE code NOT IN (
    SELECT theme_code FROM theme_embedding_progress 
    WHERE theme_code IS NOT NULL
)
ON CONFLICT (theme_code) DO NOTHING;

-- 6. Show initial progress
SELECT 
    'Setup complete - ready for BGE ingestion' as status,
    COUNT(*) as total_themes,
    COUNT(CASE WHEN embedding IS NULL THEN 1 END) as missing_embeddings,
    COUNT(CASE WHEN embedding IS NOT NULL THEN 1 END) as existing_embeddings
FROM themes;