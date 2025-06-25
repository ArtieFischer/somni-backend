-- Step 1: Create dream_embeddings table for storing chunked embeddings
CREATE TABLE IF NOT EXISTS dream_embeddings (
  id BIGSERIAL PRIMARY KEY,
  dream_id UUID NOT NULL REFERENCES dreams(id) ON DELETE CASCADE,
  embedding vector(1024) NOT NULL,
  chunk_index INT NOT NULL DEFAULT 0,
  chunk_text TEXT NOT NULL,
  token_count INT NOT NULL CHECK (token_count > 0),
  embedding_version TEXT NOT NULL DEFAULT 'bge-m3-v1',
  processing_time_ms INT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Ensure unique embedding per dream and chunk
  UNIQUE(dream_id, chunk_index, embedding_version)
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_dream_embeddings_dream_id ON dream_embeddings(dream_id);
CREATE INDEX IF NOT EXISTS idx_dream_embeddings_version ON dream_embeddings(embedding_version);

-- Create vector similarity index for semantic search
CREATE INDEX IF NOT EXISTS idx_dream_embeddings_vector ON dream_embeddings 
USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);