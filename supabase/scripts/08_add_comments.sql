-- Step 8: Add documentation comments

-- Add comments for documentation
COMMENT ON TABLE dream_embeddings IS 'Stores BGE-M3 embeddings for dream transcripts, chunked for long dreams';
COMMENT ON TABLE dream_themes IS 'Stores extracted themes from dreams based on embedding similarity';
COMMENT ON TABLE embedding_jobs IS 'Queue for async embedding generation jobs';
COMMENT ON COLUMN dreams.embedding_status IS 'Status of embedding generation: pending, processing, completed, failed, skipped';
COMMENT ON COLUMN dreams.embedding_attempts IS 'Number of attempts to generate embeddings, max 3';
COMMENT ON COLUMN dream_themes.similarity IS 'Similarity score between dream and theme (0-1)';
COMMENT ON COLUMN dream_themes.chunk_index IS 'Which chunk of the dream this theme was extracted from';
COMMENT ON FUNCTION search_similar_dreams IS 'Search for similar dreams using vector similarity';
COMMENT ON FUNCTION get_dream_themes IS 'Get themes extracted from a specific dream';
COMMENT ON FUNCTION cleanup_stale_embedding_jobs IS 'Clean up jobs stuck in processing state';