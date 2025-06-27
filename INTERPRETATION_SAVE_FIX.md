# Dream Interpretation Save Error Fix

## Error Summary
The dream interpretation is being generated successfully but fails to save to the database with error code `42501` (insufficient privilege).

## Root Causes

### 1. RLS Policy Issue
The current service role policy in the database is not correctly recognizing the service role authentication:
```sql
-- Current problematic policy
CREATE POLICY "Service role has full access"
  ON interpretations
  USING (auth.jwt() ->> 'role' = 'service_role');
```

### 2. Environment Variable Mismatch
- `.env.example` had: `SUPABASE_SERVICE_KEY`
- Code expects: `SUPABASE_SERVICE_ROLE_KEY`

## Fix Steps

### Step 1: Update Your .env File
Make sure your `.env` file uses the correct variable name:
```
SUPABASE_SERVICE_ROLE_KEY=your_actual_service_role_key_here
```

### Step 2: Apply Database Fix
Run the SQL file `fix-interpretations-rls-service-role.sql` in your Supabase SQL editor.

### Step 3: Verify the Fix
After applying the fixes, the interpretation save should work. The error log shows the interpretation is being generated correctly, it just needs the proper permissions to save.

## Testing
You can test if the fix worked by:
1. Trying to save an interpretation again
2. Checking the interpretations table in Supabase to see if the row was created

## Additional Notes
- The service role key should have full access to all tables
- Make sure you're using the service role key, not the anon key
- The interpretation data structure looks correct in your logs