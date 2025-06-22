-- Fix signup issue by ensuring the trigger and RLS policies work correctly

-- First, let's check if the trigger exists and recreate it with better error handling
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Recreate the function with better error handling and SECURITY DEFINER
CREATE OR REPLACE FUNCTION handle_new_user() 
RETURNS trigger 
SECURITY DEFINER -- This is crucial for the function to bypass RLS
SET search_path = public
AS $$
DECLARE
  default_handle text;
BEGIN
  -- Generate a unique handle if not provided
  default_handle := COALESCE(
    new.raw_user_meta_data->>'handle', 
    new.raw_user_meta_data->>'username', 
    'user_' || substring(new.id::text, 1, 8)
  );
  
  -- Ensure handle is unique by adding a suffix if needed
  WHILE EXISTS (SELECT 1 FROM profiles WHERE handle = default_handle) LOOP
    default_handle := default_handle || '_' || substring(md5(random()::text), 1, 4);
  END LOOP;

  INSERT INTO public.profiles (
    user_id, 
    handle,
    username,
    sex,
    locale,
    is_premium,
    onboarding_complete,
    location_accuracy,
    settings,
    created_at,
    updated_at
  )
  VALUES (
    new.id,
    default_handle,
    COALESCE(
      new.raw_user_meta_data->>'display_name', 
      new.raw_user_meta_data->>'full_name', 
      new.raw_user_meta_data->>'username'
    ),
    COALESCE(
      (new.raw_user_meta_data->>'sex')::sex_enum,
      'unspecified'::sex_enum
    ),
    COALESCE(new.raw_user_meta_data->>'locale', 'en'),
    false,
    false,
    'none'::loc_accuracy_enum,
    '{
      "location_sharing": "none",
      "sleep_schedule": null,
      "improve_sleep_quality": null,
      "interested_in_lucid_dreaming": null
    }'::jsonb,
    now(),
    now()
  );
  
  RETURN new;
EXCEPTION
  WHEN unique_violation THEN
    -- If there's still a unique violation, log it and continue
    RAISE LOG 'handle_new_user: unique violation for user %', new.id;
    RETURN new;
  WHEN OTHERS THEN
    -- Log other errors but don't fail the auth signup
    RAISE LOG 'handle_new_user error: % %', SQLERRM, SQLSTATE;
    RETURN new;
END;
$$ LANGUAGE plpgsql;

-- Recreate the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Ensure RLS policies allow the trigger to work
-- The SECURITY DEFINER on the function should be enough, but let's also ensure
-- there's a policy that allows service role to insert
DO $$
BEGIN
  -- Drop existing insert policy if it exists
  DROP POLICY IF EXISTS "Service role can insert profiles" ON profiles;
  
  -- Create a policy that allows service role to insert
  CREATE POLICY "Service role can insert profiles" ON profiles
    FOR INSERT
    TO service_role
    WITH CHECK (true);
END $$;

-- Also ensure the basic RLS policies exist for users
DO $$
BEGIN
  -- Drop and recreate the select policy
  DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
  
  CREATE POLICY "Users can view own profile" ON profiles
    FOR SELECT
    USING (auth.uid() = user_id);
    
  -- Drop and recreate the update policy
  DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
  
  CREATE POLICY "Users can update own profile" ON profiles
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
END $$;

-- Test that the profiles table has RLS enabled
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON profiles TO postgres, service_role;
GRANT SELECT, UPDATE ON profiles TO authenticated;
GRANT SELECT ON profiles TO anon;

-- Ensure the sequences are accessible
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;