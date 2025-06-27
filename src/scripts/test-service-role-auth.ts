import { createClient } from '@supabase/supabase-js';
import { config } from '../config';

async function testServiceRoleAuth() {
  console.log('Testing service role authentication and permissions...\n');

  // Test 1: Verify we're using service role key
  console.log('1. Service Role Key Check:');
  console.log('=' .repeat(50));
  const keyPrefix = config.supabase.serviceRoleKey.substring(0, 20);
  console.log(`Service role key starts with: ${keyPrefix}...`);
  console.log(`Key length: ${config.supabase.serviceRoleKey.length}`);
  
  // Test 2: Create client with different configurations
  console.log('\n2. Testing Different Client Configurations:');
  console.log('=' .repeat(50));

  // Config A: Basic service role client
  const clientA = createClient(
    config.supabase.url,
    config.supabase.serviceRoleKey
  );

  // Config B: Service role with explicit auth settings
  const clientB = createClient(
    config.supabase.url,
    config.supabase.serviceRoleKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false
      },
      db: {
        schema: 'public'
      },
      global: {
        headers: {
          'apikey': config.supabase.serviceRoleKey
        }
      }
    }
  );

  // Test both clients
  const clients = [
    { name: 'Basic Service Client', client: clientA },
    { name: 'Configured Service Client', client: clientB }
  ];

  for (const { name, client } of clients) {
    console.log(`\nTesting: ${name}`);
    console.log('-'.repeat(30));

    // Test simple select
    const { data, error, count } = await client
      .from('interpretations')
      .select('id', { count: 'exact', head: true });

    if (error) {
      console.error(`❌ Failed: ${error.message} (${error.code})`);
    } else {
      console.log(`✅ Success: Can access interpretations table (${count || 0} rows)`);
    }
  }

  // Test 3: Check auth context
  console.log('\n3. Auth Context Check:');
  console.log('=' .repeat(50));
  
  // This should fail for service role (no user session)
  const { data: userData, error: userError } = await clientA.auth.getUser();
  if (userError) {
    console.log(`✅ No user session (expected for service role): ${userError.message}`);
  } else {
    console.log(`⚠️  Unexpected user data: ${userData?.user?.id}`);
  }

  // Test 4: Direct insert test
  console.log('\n4. Direct Insert Test:');
  console.log('=' .repeat(50));

  const testData = {
    dream_id: '00000000-0000-0000-0000-000000000001',
    user_id: '00000000-0000-0000-0000-000000000002',
    interpreter_type: 'test',
    interpretation_summary: 'Service role test',
    full_response: { test: true }
  };

  const { data: insertData, error: insertError } = await clientB
    .from('interpretations')
    .insert(testData)
    .select()
    .single();

  if (insertError) {
    console.error(`❌ Insert failed: ${insertError.message} (${insertError.code})`);
    console.error('Details:', insertError.details);
    console.error('Hint:', insertError.hint);
  } else {
    console.log(`✅ Insert succeeded! ID: ${insertData.id}`);
    
    // Clean up
    const { error: deleteError } = await clientB
      .from('interpretations')
      .delete()
      .eq('id', insertData.id);
      
    if (!deleteError) {
      console.log('✅ Test data cleaned up');
    }
  }

  // Test 5: Raw SQL execution (if available)
  console.log('\n5. Testing Raw SQL Access:');
  console.log('=' .repeat(50));

  const { data: sqlData, error: sqlError } = await clientB.rpc('get_current_user_info', {});
  
  if (sqlError) {
    if (sqlError.code === 'PGRST202') {
      console.log('ℹ️  RPC function not available (expected)');
    } else {
      console.error(`SQL Error: ${sqlError.message}`);
    }
  } else {
    console.log('Current context:', sqlData);
  }
}

// Run the test
testServiceRoleAuth()
  .then(() => {
    console.log('\n\n✅ Test completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n\n❌ Test failed:', error);
    process.exit(1);
  });