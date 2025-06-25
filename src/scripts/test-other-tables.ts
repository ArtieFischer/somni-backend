import { createClient } from '@supabase/supabase-js';
import { config } from '../config';

async function testOtherTables() {
  console.log('Testing service role access to different tables...\n');

  const serviceClient = createClient(
    config.supabase.url,
    config.supabase.serviceRoleKey,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false
      }
    }
  );

  const tables = [
    'dreams',
    'dream_chunks', 
    'dream_embeddings',
    'dream_themes',
    'embedding_jobs',
    'transcription_usage'
  ];

  for (const table of tables) {
    console.log(`\nTesting table: ${table}`);
    console.log('-'.repeat(40));
    
    try {
      // Try to count rows
      const { count, error } = await serviceClient
        .from(table)
        .select('*', { count: 'exact', head: true });
      
      if (error) {
        console.error(`❌ Failed:`, error.message, `(Code: ${error.code})`);
      } else {
        console.log(`✅ Success! Row count:`, count ?? 0);
      }
    } catch (err) {
      console.error(`❌ Unexpected error:`, err);
    }
  }

  // Also try to list all tables we have access to
  console.log('\n\nTrying to access auth schema (service role should have access):');
  console.log('=' .repeat(50));
  
  try {
    const { count, error } = await serviceClient
      .from('auth.users')
      .select('*', { count: 'exact', head: true });
    
    if (error) {
      console.error('❌ Auth schema access failed:', error.message);
    } else {
      console.log('✅ Auth schema access succeeded! User count:', count);
    }
  } catch (err) {
    console.error('❌ Unexpected error:', err);
  }
}

// Run the test
testOtherTables().catch(console.error);