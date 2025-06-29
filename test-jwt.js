const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Quick test to get JWT token
async function getTestToken() {
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
  );

  console.log('Supabase URL:', process.env.SUPABASE_URL);
  console.log('Has Anon Key:', !!process.env.SUPABASE_ANON_KEY);

  // Try to sign in
  const { data, error } = await supabase.auth.signInWithPassword({
    email: 'test@example.com',
    password: 'testpassword123'
  });

  if (error) {
    console.error('Error:', error.message);
    console.log('\nTrying to create user...');
    
    const { data: newUser, error: signupError } = await supabase.auth.signUp({
      email: 'test@example.com',
      password: 'testpassword123'
    });
    
    if (signupError) {
      console.error('Signup error:', signupError.message);
      console.log('\nFor now, use your service role key for testing:');
      console.log(`Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY?.substring(0, 20)}...`);
      return;
    }
    
    console.log('User created!');
    console.log('Token:', newUser.session?.access_token);
    return;
  }

  console.log('\n✅ Success! Use this token:\n');
  console.log(data.session?.access_token);
  console.log('\n📋 Full curl command:\n');
  console.log(`curl -X POST http://localhost:3000/api/v1/conversations/elevenlabs/init \\
  -H "Authorization: Bearer ${data.session?.access_token}" \\
  -H "Content-Type: application/json" \\
  -d '{"dreamId": "YOUR_DREAM_ID", "interpreterId": "jung"}'`);
}

getTestToken().catch(console.error);