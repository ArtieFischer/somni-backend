-- Add resumed_at column to conversations table
ALTER TABLE conversations 
ADD COLUMN IF NOT EXISTS resumed_at TIMESTAMP WITH TIME ZONE;

-- Add index for efficient querying
CREATE INDEX IF NOT EXISTS idx_conversations_user_dream_interpreter 
ON conversations (user_id, dream_id, interpreter_id);

-- Add comment
COMMENT ON COLUMN conversations.resumed_at IS 'Timestamp when conversation was resumed after being ended';