# How to Run the Latest Migration

## Latest Migration: Fix dream_images Permissions

The latest migration file `20250125000001_fix_dream_images_permissions.sql` fixes the permission issue where the service role couldn't insert into the `dream_images` table.

## Steps to Apply the Migration:

### Option 1: Via Supabase Dashboard (Recommended)

1. Go to your Supabase Dashboard
2. Navigate to the SQL Editor
3. Copy the contents of `20250125000001_fix_dream_images_permissions.sql`
4. Paste it into the SQL editor
5. Click "Run" to execute the migration

### Option 2: Via Supabase CLI

If you have the Supabase CLI installed:

```bash
# From the project root
cd supabase
supabase db push
```

### Option 3: Direct SQL Execution

Run this SQL directly in your Supabase SQL editor:

```sql
-- Fix dream_images permissions
GRANT INSERT, SELECT, UPDATE, DELETE ON dream_images TO authenticated;
GRANT ALL ON dream_images TO service_role;

-- Verify RLS is enabled
ALTER TABLE dream_images ENABLE ROW LEVEL SECURITY;
```

## Verification

After running the migration, you can verify it worked by running:

```sql
-- Check table permissions
SELECT 
    grantee, 
    privilege_type 
FROM 
    information_schema.role_table_grants 
WHERE 
    table_name = 'dream_images';
```

You should see INSERT, SELECT, UPDATE, DELETE permissions for `authenticated` and all permissions for `service_role`.