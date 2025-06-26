-- Drop existing interpretations table to redesign
DROP TABLE IF EXISTS interpretations CASCADE;

-- Create or replace the update_updated_at_column function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create improved interpretations table
CREATE TABLE interpretations (
  -- Core fields
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  dream_id UUID NOT NULL REFERENCES dreams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  interpreter_type TEXT NOT NULL REFERENCES interpreters(id),
  
  -- Interpretation content
  interpretation_summary TEXT NOT NULL, -- 2-3 paragraph summary for display
  full_response JSONB NOT NULL, -- Complete structured response from interpreter
  
  -- Extracted elements for search/filtering
  dream_topic TEXT NOT NULL, -- Brief phrase capturing core theme
  quick_take TEXT NOT NULL, -- 2-3 sentence summary
  symbols TEXT[] DEFAULT '{}', -- Array of key symbols
  
  -- Emotional analysis
  emotional_tone JSONB, -- {primary, secondary, intensity}
  
  -- Searchable insights
  primary_insight TEXT, -- Main psychological/spiritual insight
  key_pattern TEXT, -- Recurring pattern identified
  
  -- Metadata
  knowledge_fragments_used INTEGER DEFAULT 0, -- How many fragments enriched the interpretation
  total_fragments_retrieved INTEGER DEFAULT 0, -- Total fragments before quality control
  fragment_ids_used TEXT[] DEFAULT '{}', -- IDs of fragments that enriched the interpretation
  processing_time_ms INTEGER, -- Time taken to generate
  model_used TEXT DEFAULT 'gpt-4o', -- AI model used
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Versioning (for re-interpretations)
  version INTEGER DEFAULT 1,
  previous_version_id UUID REFERENCES interpretations(id),
  
  -- Indexes for performance
  CONSTRAINT unique_dream_interpreter_version UNIQUE(dream_id, interpreter_type, version)
);

-- Create indexes for common queries
CREATE INDEX idx_interpretations_user_id ON interpretations(user_id);
CREATE INDEX idx_interpretations_dream_id ON interpretations(dream_id);
CREATE INDEX idx_interpretations_interpreter_type ON interpretations(interpreter_type);
CREATE INDEX idx_interpretations_symbols ON interpretations USING GIN(symbols);
CREATE INDEX idx_interpretations_fragment_ids ON interpretations USING GIN(fragment_ids_used);
CREATE INDEX idx_interpretations_created_at ON interpretations(created_at DESC);

-- Index for efficient joins with dream_themes for memory queries
CREATE INDEX idx_interpretations_dream_interpreter ON interpretations(dream_id, interpreter_type);

-- Full text search index on key content
CREATE INDEX idx_interpretations_search ON interpretations 
  USING GIN(to_tsvector('english', 
    COALESCE(interpretation_summary, '') || ' ' || 
    COALESCE(primary_insight, '') || ' ' || 
    COALESCE(dream_topic, '')
  ));

-- Enable RLS
ALTER TABLE interpretations ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own interpretations"
  ON interpretations FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own interpretations"
  ON interpretations FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Service role has full access"
  ON interpretations
  USING (auth.jwt() ->> 'role' = 'service_role');

-- Add trigger for updated_at
CREATE TRIGGER update_interpretations_updated_at
  BEFORE UPDATE ON interpretations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Comment on table
COMMENT ON TABLE interpretations IS 'Stores dream interpretations with full structured output for future AI memory retrieval';
COMMENT ON COLUMN interpretations.full_response IS 'Complete JSON response including all interpreter-specific fields';
COMMENT ON COLUMN interpretations.interpretation_summary IS 'The main interpretation text shown to users (from interpretation field)';