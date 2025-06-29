const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

async function testElevenLabsAPI() {
  // Use service role client to bypass auth
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      }
    }
  );

  console.log('🔍 Finding test data...\n');

  try {
    // Get a recent dream with a user
    const { data: dreams, error: dreamError } = await supabase
      .from('dreams')
      .select(`
        id,
        user_id,
        created_at,
        raw_transcript
      `)
      .order('created_at', { ascending: false })
      .limit(5);

    if (dreamError) {
      console.error('Error fetching dreams:', dreamError);
      return;
    }

    if (!dreams || dreams.length === 0) {
      console.log('No dreams found in database!');
      return;
    }

    console.log(`Found ${dreams.length} dreams\n`);

    // Use the first dream for testing
    const testDream = dreams[0];
    console.log('📋 Test Data:');
    console.log(`Dream ID: ${testDream.id}`);
    console.log(`User ID: ${testDream.user_id}`);
    console.log(`Created: ${new Date(testDream.created_at).toLocaleDateString()}`);
    console.log(`Has transcript: ${!!testDream.raw_transcript}\n`);

    // Generate test commands
    console.log('🚀 Test Commands:\n');
    
    console.log('1️⃣ Using Service Role Key (for testing):');
    console.log('```bash');
    console.log(`curl -X POST http://localhost:3000/api/v1/conversations/elevenlabs/init \\
  -H "Authorization: Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}" \\
  -H "Content-Type: application/json" \\
  -d '{"dreamId": "${testDream.id}", "interpreterId": "jung"}'`);
    console.log('```\n');

    console.log('2️⃣ To get a real user JWT token:');
    console.log('- Log into your React Native app');
    console.log('- The JWT is in: session.access_token');
    console.log('- Or create a user with a real email\n');

    // Try to make the actual API call
    console.log('3️⃣ Testing the API now...\n');
    
    const response = await fetch('http://localhost:3000/api/v1/conversations/elevenlabs/init', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        dreamId: testDream.id,
        interpreterId: 'jung'
      })
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('❌ API Error:', response.status, error);
      
      if (response.status === 401) {
        console.log('\n💡 Auth middleware is blocking service role key.');
        console.log('You need to either:');
        console.log('1. Use a real user JWT from your app');
        console.log('2. Temporarily modify the auth middleware for testing');
      }
    } else {
      const result = await response.json();
      console.log('✅ Success! Response:');
      console.log(JSON.stringify(result, null, 2));
    }

  } catch (error) {
    console.error('Error:', error);
  }
}

// Run test
console.log('🧪 ElevenLabs API Test\n');
testElevenLabsAPI();