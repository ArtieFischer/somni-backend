-- Create elevenlabs_sessions table for managing ElevenLabs conversation sessions
CREATE TABLE IF NOT EXISTS elevenlabs_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  agent_id VARCHAR(255) NOT NULL,
  session_token TEXT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_elevenlabs_sessions_user_id ON elevenlabs_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_elevenlabs_sessions_conversation_id ON elevenlabs_sessions(conversation_id);
CREATE INDEX IF NOT EXISTS idx_elevenlabs_sessions_expires_at ON elevenlabs_sessions(expires_at);

-- Add columns to conversations table if they don't exist
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS elevenlabs_agent_id VARCHAR(255);
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS implementation_type VARCHAR(50) DEFAULT 'websocket';

-- Add constraint for implementation_type
ALTER TABLE conversations ADD CONSTRAINT chk_implementation_type 
  CHECK (implementation_type IN ('websocket', 'elevenlabs'));

-- Add ElevenLabs metadata to messages table
ALTER TABLE messages ADD COLUMN IF NOT EXISTS elevenlabs_metadata JSONB;

-- Create updated_at trigger for elevenlabs_sessions
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_elevenlabs_sessions_updated_at 
  BEFORE UPDATE ON elevenlabs_sessions 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- Add RLS policies
ALTER TABLE elevenlabs_sessions ENABLE ROW LEVEL SECURITY;

-- Users can only access their own sessions
CREATE POLICY "Users can view own sessions" ON elevenlabs_sessions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own sessions" ON elevenlabs_sessions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own sessions" ON elevenlabs_sessions
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own sessions" ON elevenlabs_sessions
  FOR DELETE USING (auth.uid() = user_id);

-- Service role has full access
CREATE POLICY "Service role has full access" ON elevenlabs_sessions
  FOR ALL USING (auth.jwt()->>'role' = 'service_role');

-- Add comments
COMMENT ON TABLE elevenlabs_sessions IS 'Stores ElevenLabs conversation session tokens';
COMMENT ON COLUMN elevenlabs_sessions.agent_id IS 'ElevenLabs agent ID for the interpreter';
COMMENT ON COLUMN elevenlabs_sessions.session_token IS 'JWT or signed URL token for ElevenLabs API';
COMMENT ON COLUMN elevenlabs_sessions.expires_at IS 'When the session token expires';
COMMENT ON COLUMN conversations.elevenlabs_agent_id IS 'ElevenLabs agent ID if using React SDK';
COMMENT ON COLUMN conversations.implementation_type IS 'websocket or elevenlabs implementation';
COMMENT ON COLUMN messages.elevenlabs_metadata IS 'ElevenLabs specific metadata like audio_url';