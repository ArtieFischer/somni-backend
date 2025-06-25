import { createClient } from '@supabase/supabase-js';
import { config } from '../config';

async function testServiceRoleDirect() {
  console.log('Testing direct service role access...\n');

  // Create multiple clients to test different configurations
  const clients = [
    {
      name: 'Standard Service Client',
      client: createClient(
        config.supabase.url,
        config.supabase.serviceRoleKey
      )
    },
    {
      name: 'Service Client with Auth Config',
      client: createClient(
        config.supabase.url,
        config.supabase.serviceRoleKey,
        {
          auth: {
            persistSession: false,
            autoRefreshToken: false,
            detectSessionInUrl: false
          }
        }
      )
    },
    {
      name: 'Service Client with Full Config',
      client: createClient(
        config.supabase.url,
        config.supabase.serviceRoleKey,
        {
          auth: {
            persistSession: false,
            autoRefreshToken: false,
            detectSessionInUrl: false
          },
          global: {
            headers: {
              'apikey': config.supabase.serviceRoleKey,
              'Authorization': `Bearer ${config.supabase.serviceRoleKey}`
            }
          }
        }
      )
    }
  ];

  for (const { name, client } of clients) {
    console.log(`\nTesting with: ${name}`);
    console.log('=' .repeat(50));
    
    try {
      // Test 1: Simple select
      const { data, error } = await client
        .from('embedding_jobs')
        .select('dream_id')
        .limit(1);
      
      if (error) {
        console.error('❌ Select failed:', error.message, `(Code: ${error.code})`);
      } else {
        console.log('✅ Select succeeded!', data ? `Found ${data.length} rows` : 'No data');
      }
      
      // Test 2: Try to get user info (should be null for service role)
      const { data: userData, error: userError } = await client.auth.getUser();
      
      if (userError) {
        console.log('Auth check:', userError.message);
      } else {
        console.log('Auth user:', userData?.user?.id || 'No user (as expected for service role)');
      }
      
    } catch (err) {
      console.error('Unexpected error:', err);
    }
  }

  // Also test with anon key for comparison
  console.log('\n\nTesting with Anon Key for comparison:');
  console.log('=' .repeat(50));
  
  const anonClient = createClient(
    config.supabase.url,
    config.supabase.anonKey
  );
  
  const { data: anonData, error: anonError } = await anonClient
    .from('embedding_jobs')
    .select('dream_id')
    .limit(1);
  
  if (anonError) {
    console.error('❌ Anon select failed:', anonError.message, `(Code: ${anonError.code})`);
  } else {
    console.log('✅ Anon select succeeded!', anonData ? `Found ${anonData.length} rows` : 'No data');
  }
}

// Run the test
testServiceRoleDirect().catch(console.error);