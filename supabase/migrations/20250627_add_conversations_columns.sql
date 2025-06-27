-- Add missing columns to conversations table
-- These columns are expected by the conversation service but missing from the schema

-- Add status column with enum type
CREATE TYPE conversation_status_enum AS ENUM ('active', 'ended', 'error');

ALTER TABLE conversations 
ADD COLUMN status conversation_status_enum NOT NULL DEFAULT 'active';

-- Add ended_at column for tracking when conversations end
ALTER TABLE conversations 
ADD COLUMN ended_at timestamptz;

-- Add elevenlabs_session_id for voice conversation tracking
ALTER TABLE conversations 
ADD COLUMN elevenlabs_session_id text;

-- Add indexes for performance
CREATE INDEX idx_conversations_status ON conversations(status);
CREATE INDEX idx_conversations_ended_at ON conversations(ended_at);

-- Add comment to document the columns
COMMENT ON COLUMN conversations.status IS 'Current status of the conversation';
COMMENT ON COLUMN conversations.ended_at IS 'Timestamp when the conversation ended';
COMMENT ON COLUMN conversations.elevenlabs_session_id IS 'ElevenLabs session ID for voice conversations';

-- Fix messages table to match conversation service expectations
-- Add role column (the service expects 'role' not 'sender')
ALTER TABLE messages ADD COLUMN role text;

-- Migrate existing data from sender to role
UPDATE messages SET role = CASE 
  WHEN sender = 'user' THEN 'user'
  WHEN sender = 'interpreter' THEN 'assistant'
  WHEN sender = 'system' THEN 'assistant'
END;

-- Make role NOT NULL after migration
ALTER TABLE messages ALTER COLUMN role SET NOT NULL;

-- Add constraint for role values
ALTER TABLE messages ADD CONSTRAINT chk_role CHECK (role IN ('user', 'assistant'));

-- Add audio_url column for voice messages
ALTER TABLE messages ADD COLUMN audio_url text;

-- Create index for role column
CREATE INDEX idx_messages_role ON messages(role);

-- Add comments
COMMENT ON COLUMN messages.role IS 'Role of the message sender (user or assistant)';
COMMENT ON COLUMN messages.audio_url IS 'URL to audio file for voice messages';