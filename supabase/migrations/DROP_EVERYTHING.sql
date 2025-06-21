-- =====================================================================
-- COMPLETE DATABASE RESET SCRIPT
-- This drops EVERYTHING including storage policies
-- =====================================================================

-- Drop all storage policies first
DROP POLICY IF EXISTS "Users can upload own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Public avatar access" ON storage.objects;
DROP POLICY IF EXISTS "Public interpreter images" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload own dream images" ON storage.objects;
DROP POLICY IF EXISTS "Users can view own dream images" ON storage.objects;
DROP POLICY IF EXISTS "Service role can manage all dream images" ON storage.objects;

-- Drop the public schema and recreate
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO public;

-- Note: This doesn't drop auth.users or storage.buckets
-- If you need to clear those too, run:
-- DELETE FROM auth.users;
-- DELETE FROM storage.objects;
-- DELETE FROM storage.buckets;