import { supabaseService } from '../services/supabase';
import { config } from '../config';

async function testServiceClient() {
  console.log('Testing service client access to embedding_jobs table...\n');
  
  // Log configuration (redact the actual key)
  console.log('Configuration check:');
  console.log('- Supabase URL:', config.supabase.url);
  console.log('- Service Role Key:', config.supabase.serviceRoleKey ? `${config.supabase.serviceRoleKey.substring(0, 20)}...` : 'NOT SET');
  console.log('- Anon Key:', config.supabase.anonKey ? `${config.supabase.anonKey.substring(0, 20)}...` : 'NOT SET');
  console.log('\n');

  try {
    // Test 1: Try to count rows in embedding_jobs
    console.log('Test 1: Counting rows in embedding_jobs table...');
    const { count, error: countError } = await supabaseService.getServiceClient()
      .from('embedding_jobs')
      .select('*', { count: 'exact', head: true });
    
    if (countError) {
      console.error('❌ Count failed:', countError);
    } else {
      console.log('✅ Count succeeded! Total rows:', count);
    }
    console.log('\n');

    // Test 2: Try to select from embedding_jobs
    console.log('Test 2: Selecting from embedding_jobs table...');
    const { data, error: selectError } = await supabaseService.getServiceClient()
      .from('embedding_jobs')
      .select('dream_id, status')
      .limit(5);
    
    if (selectError) {
      console.error('❌ Select failed:', selectError);
    } else {
      console.log('✅ Select succeeded! Found', data?.length || 0, 'rows');
      if (data && data.length > 0) {
        console.log('Sample data:', data);
      }
    }
    console.log('\n');

    // Test 3: Try to insert a test job
    console.log('Test 3: Inserting a test job...');
    const testDreamId = 'test-' + Date.now();
    const { error: insertError } = await supabaseService.getServiceClient()
      .from('embedding_jobs')
      .insert({
        dream_id: testDreamId,
        status: 'pending',
        priority: 0,
        scheduled_at: new Date().toISOString()
      });
    
    if (insertError) {
      console.error('❌ Insert failed:', insertError);
    } else {
      console.log('✅ Insert succeeded!');
      
      // Clean up the test record
      const { error: deleteError } = await supabaseService.getServiceClient()
        .from('embedding_jobs')
        .delete()
        .eq('dream_id', testDreamId);
      
      if (deleteError) {
        console.error('Failed to clean up test record:', deleteError);
      } else {
        console.log('Test record cleaned up');
      }
    }
    console.log('\n');

    // Test 4: Check if we can call RPC functions
    console.log('Test 4: Calling cleanup_stale_embedding_jobs RPC function...');
    const { data: rpcData, error: rpcError } = await supabaseService.getServiceClient()
      .rpc('cleanup_stale_embedding_jobs');
    
    if (rpcError) {
      console.error('❌ RPC call failed:', rpcError);
    } else {
      console.log('✅ RPC call succeeded! Result:', rpcData);
    }
    console.log('\n');

    // Test 5: Check auth.uid() in context
    console.log('Test 5: Checking auth context...');
    const { data: authData, error: authError } = await supabaseService.getServiceClient()
      .rpc('auth.uid' as any);
    
    if (authError) {
      // This is expected to fail
      console.log('Auth check (expected to fail for service role):', authError.message);
    } else {
      console.log('Auth UID:', authData);
    }

  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

// Run the test
testServiceClient().catch(console.error);