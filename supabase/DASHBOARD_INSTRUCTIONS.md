# Supabase Dashboard Instructions for Dream Transcription Fix

## Overview
These instructions will guide you through updating the database schema in Supabase to make dream transcription work with the new frontend changes.

## Prerequisites
- Access to Supabase Dashboard with admin privileges
- Backup of current database (recommended)

## Step-by-Step Instructions

### 1. Run the Migration SQL

1. Open your Supabase Dashboard
2. Navigate to **SQL Editor** (in the left sidebar)
3. Click **New Query**
4. Copy the entire contents of `supabase/migrations/20250125_dreams_table_overhaul.sql`
5. Paste it into the SQL editor
6. **IMPORTANT**: Review the migration, especially Step 4 which drops columns
7. Click **Run** to execute the migration

**Note**: The migration will:
- Update enum values for `transcription_status`
- Add new columns: `mood`, `clarity`, `location_metadata`
- Remove old columns: `refined_narrative`, `sleep_phase`, `mood_before`, `mood_after`, `location`, `location_accuracy`, `embedding`

### 2. Verify the Migration

Run this query to verify the changes:

```sql
-- Check the dreams table structure
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'dreams'
ORDER BY ordinal_position;

-- Check enum values
SELECT unnest(enum_range(NULL::transcription_status_enum)) as status_values;

-- Check if any dreams have the new fields
SELECT 
  id,
  transcription_status,
  mood,
  clarity,
  location_metadata
FROM dreams
LIMIT 5;
```

### 3. Update Environment Variables (if needed)

Make sure your edge functions have these environment variables set:
- `SOMNI_BACKEND_URL` - Your backend API URL
- `SOMNI_BACKEND_API_SECRET` - Your backend API secret

You can check/update these in:
1. Go to **Settings** → **Edge Functions**
2. Check the environment variables section

### 4. Regenerate TypeScript Types

After the migration is complete:

1. In your local development environment, run:
   ```bash
   npx supabase gen types typescript --project-id YOUR_PROJECT_ID > supabase/types/database.types.ts
   ```

2. This will update the TypeScript types to match your new database schema

### 5. Test the Transcription Flow

1. Create a test dream record:
   ```sql
   INSERT INTO dreams (
     user_id,
     transcription_status,
     is_lucid,
     created_at
   ) VALUES (
     'YOUR_USER_ID_HERE',
     'pending',
     false,
     NOW()
   );
   ```

2. Try the transcription flow from the mobile app
3. Monitor the edge function logs in **Functions** → **Logs**

### 6. Rollback Plan (if needed)

If you need to rollback:

```sql
-- Re-add removed columns (data will be lost)
ALTER TABLE dreams 
ADD COLUMN refined_narrative text,
ADD COLUMN sleep_phase sleep_phase_enum DEFAULT 'unknown',
ADD COLUMN mood_before smallint,
ADD COLUMN mood_after smallint,
ADD COLUMN location geography(Point, 4326),
ADD COLUMN location_accuracy loc_accuracy_enum DEFAULT 'none',
ADD COLUMN embedding vector(384);

-- Remove new columns
ALTER TABLE dreams 
DROP COLUMN mood,
DROP COLUMN clarity,
DROP COLUMN location_metadata;

-- Note: You cannot easily revert enum changes in PostgreSQL
```

## Troubleshooting

### Common Issues:

1. **"column does not exist" errors**
   - Make sure the migration ran successfully
   - Check that you're using the latest backend code

2. **Transcription status not updating**
   - Verify edge function environment variables
   - Check edge function logs for errors
   - Ensure the backend service is running and accessible

3. **Type errors in frontend**
   - Regenerate TypeScript types after migration
   - Make sure frontend is using the updated types

### Monitoring

After deployment, monitor:
1. **Edge Function Logs**: Functions → dreams-transcribe-init → Logs
2. **Database Logs**: Settings → Logs → Database
3. **Backend Service Logs**: Check your backend deployment logs

## Next Steps

Once the migration is complete and tested:
1. Deploy the updated backend code
2. Update the frontend to use the new schema
3. Monitor for any issues in production

## Support

If you encounter issues:
1. Check the edge function logs first
2. Verify all environment variables are set correctly
3. Ensure the backend service is accessible from Supabase edge functions