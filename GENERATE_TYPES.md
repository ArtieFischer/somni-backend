# How to Generate TypeScript Types from Supabase

After making database schema changes, you need to regenerate the TypeScript types.

## Using Supabase CLI

1. **Install Supabase CLI** (if not already installed):
   ```bash
   brew install supabase/tap/supabase
   ```

2. **Login to Supabase** (if not already logged in):
   ```bash
   supabase login
   ```

3. **Generate types** from your Supabase project:
   ```bash
   supabase gen types typescript --project-id YOUR_PROJECT_ID > supabase/types/database.types.ts
   ```

   Or if you have a local config:
   ```bash
   supabase gen types typescript --linked > supabase/types/database.types.ts
   ```

## Alternative: Using Direct URL

If you have your Supabase project URL and anon key:

```bash
npx supabase gen types typescript --db-url "postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres" > supabase/types/database.types.ts
```

## What this does

This command:
1. Connects to your Supabase database
2. Reads the current schema
3. Generates TypeScript types for all tables, views, and functions
4. Outputs to `supabase/types/database.types.ts`

## After generating

The backend will automatically use the updated types, including:
- The new `language_code` and `character_count` columns in `transcription_usage`
- Any other schema changes you've made