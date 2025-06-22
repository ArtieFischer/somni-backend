# Fix Knowledge Base Table Access

The ingestion is failing because Row Level Security (RLS) is blocking even the service role key. This is happening because the RLS policy `knowledge_base_service_role_all` uses `auth.role()` which requires an authenticated session, but service role keys when used programmatically don't create a session.

## Quick Fix (Recommended for Ingestion)

Run this SQL in your Supabase SQL editor to temporarily disable RLS:

```sql
-- Disable RLS for ingestion
ALTER TABLE knowledge_base DISABLE ROW LEVEL SECURITY;
```

After ingestion is complete, re-enable RLS:

```sql
-- Re-enable RLS after ingestion
ALTER TABLE knowledge_base ENABLE ROW LEVEL SECURITY;
```

## Permanent Fix (Better Long-term Solution)

Update the RLS policies to properly handle service role access:

```sql
-- Drop the existing service role policy
DROP POLICY IF EXISTS knowledge_base_service_role_all ON knowledge_base;

-- Create a new policy that allows service role to bypass RLS
-- Option 1: Grant the service role the bypassrls privilege (recommended)
-- This must be done by a superuser in Supabase dashboard SQL editor
ALTER ROLE service_role WITH BYPASSRLS;

-- Option 2: Create a permissive policy for service role
-- This works but is less elegant
CREATE POLICY knowledge_base_service_role_all ON knowledge_base
  FOR ALL 
  TO service_role
  USING (true)
  WITH CHECK (true);
```

## Testing the Fix

After applying one of the fixes above, run:

```bash
npm run ingest-knowledge -- --interpreter=jung
```

The ingestion should now work properly and show progress like:
- Book preprocessing
- Chunking and classification
- Embedding generation
- Database insertion with success messages

## Security Note

The anon key correctly has read-only access via the `knowledge_base_public_read` policy. This is the proper security setup - only the service role should be able to modify the knowledge base.