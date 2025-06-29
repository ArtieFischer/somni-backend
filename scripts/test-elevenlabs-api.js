const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

async function testElevenLabsAPI() {
  try {
    // 1. Sign in with a test user (create one if needed)
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: 'test@example.com', // Replace with your test user
      password: 'testpassword123' // Replace with your test password
    });

    if (authError) {
      console.error('Auth error:', authError);
      
      // Try to create user if doesn't exist
      console.log('Attempting to create user...');
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: 'test@example.com',
        password: 'testpassword123'
      });
      
      if (signUpError) {
        console.error('Signup error:', signUpError);
        return;
      }
      
      console.log('User created:', signUpData.user?.email);
      console.log('JWT Token:', signUpData.session?.access_token);
      return;
    }

    console.log('Successfully authenticated!');
    console.log('User:', authData.user?.email);
    console.log('\n=== JWT Token ===');
    console.log(authData.session?.access_token);
    console.log('\n=== Use this token in Authorization header ===');
    console.log(`Authorization: Bearer ${authData.session?.access_token}`);
    
    // 2. Get a dream ID for testing
    const { data: dreams, error: dreamError } = await supabase
      .from('dreams')
      .select('id, recorded_at')
      .eq('user_id', authData.user.id)
      .order('recorded_at', { ascending: false })
      .limit(1);
    
    if (dreams && dreams.length > 0) {
      console.log('\n=== Test Dream ID ===');
      console.log(dreams[0].id);
      
      // 3. Generate test curl command
      console.log('\n=== Test CURL Command ===');
      console.log(`curl -X POST http://localhost:3000/api/v1/conversations/elevenlabs/init \\
  -H "Authorization: Bearer ${authData.session?.access_token}" \\
  -H "Content-Type: application/json" \\
  -d '{"dreamId": "${dreams[0].id}", "interpreterId": "jung"}'`);
    } else {
      console.log('\nNo dreams found for this user. Create a dream first.');
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}

// Run the test
testElevenLabsAPI();