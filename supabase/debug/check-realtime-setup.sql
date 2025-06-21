-- Check if realtime is enabled for the dreams table
-- Run this in the Supabase SQL editor

-- 1. Check if the supabase_realtime publication exists
SELECT pubname
FROM pg_publication
WHERE pubname = 'supabase_realtime';

-- 2. Check which tables are included in the publication
SELECT schemaname, tablename
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime';

-- 3. Check if dreams table is in the publication
SELECT schemaname, tablename
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime'
  AND schemaname = 'public'
  AND tablename = 'dreams';

-- 4. If dreams table is not in the publication, add it
-- ALTER PUBLICATION supabase_realtime ADD TABLE public.dreams;

-- 5. Check RLS policies on dreams table
SELECT pol.polname, pol.polcmd, pol.polroles, pol.polqual, pol.polwithcheck
FROM pg_policy pol
JOIN pg_class cls ON pol.polrelid = cls.oid
JOIN pg_namespace nsp ON cls.relnamespace = nsp.oid
WHERE nsp.nspname = 'public' AND cls.relname = 'dreams';

-- 6. Check if RLS is enabled on dreams table
SELECT relname, relrowsecurity
FROM pg_class
WHERE relname = 'dreams';

-- 7. Test query to see recent dreams updates
SELECT id, user_id, transcription_status, updated_at, created_at
FROM public.dreams
ORDER BY updated_at DESC
LIMIT 10;