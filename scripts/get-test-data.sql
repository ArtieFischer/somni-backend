-- Run this in Supabase SQL editor to find test data

-- Get a test user
SELECT id, email FROM auth.users LIMIT 5;

-- Get dreams for a specific user (replace USER_ID)
SELECT id, recorded_at, user_id 
FROM dreams 
WHERE user_id = 'USER_ID' 
ORDER BY recorded_at DESC 
LIMIT 5;

-- Get all recent dreams
SELECT d.id as dream_id, d.user_id, u.email 
FROM dreams d
JOIN auth.users u ON d.user_id = u.id
ORDER BY d.recorded_at DESC
LIMIT 10;