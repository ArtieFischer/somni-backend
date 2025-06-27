# Conversations Table Migration

## Issue
The conversation service expects the following columns that are missing from the database schema:
- In `conversations` table: `status`, `ended_at`, `elevenlabs_session_id`
- In `messages` table: `role` (instead of `sender`), `audio_url`

## Migration File
`20250627_add_conversations_columns.sql`

## What this migration does:
1. Adds `status` column to conversations table with enum type ('active', 'ended', 'error')
2. Adds `ended_at` timestamp column to track when conversations end
3. Adds `elevenlabs_session_id` for voice conversation tracking
4. Adds `role` column to messages table and migrates data from `sender`
5. Adds `audio_url` column to messages table for voice messages
6. Creates appropriate indexes for performance

## How to run the migration:

### Option 1: Using Supabase CLI (Recommended)
```bash
supabase db push
```

### Option 2: Direct SQL execution
1. Connect to your Supabase database
2. Run the SQL file:
```bash
psql -h <your-db-host> -U postgres -d postgres -f supabase/migrations/20250627_add_conversations_columns.sql
```

### Option 3: Via Supabase Dashboard
1. Go to SQL Editor in Supabase Dashboard
2. Copy the contents of `20250627_add_conversations_columns.sql`
3. Execute the query

## Verification
After running the migration, verify the changes:

```sql
-- Check conversations table structure
\d conversations

-- Check messages table structure  
\d messages

-- Verify enum type was created
SELECT enum_range(NULL::conversation_status_enum);
```

## Rollback (if needed)
```sql
-- Remove columns from conversations
ALTER TABLE conversations DROP COLUMN IF EXISTS status;
ALTER TABLE conversations DROP COLUMN IF EXISTS ended_at;
ALTER TABLE conversations DROP COLUMN IF EXISTS elevenlabs_session_id;

-- Remove columns from messages
ALTER TABLE messages DROP COLUMN IF EXISTS role;
ALTER TABLE messages DROP COLUMN IF EXISTS audio_url;

-- Drop enum type
DROP TYPE IF EXISTS conversation_status_enum;

-- Drop indexes
DROP INDEX IF EXISTS idx_conversations_status;
DROP INDEX IF EXISTS idx_conversations_ended_at;
DROP INDEX IF EXISTS idx_messages_role;
```