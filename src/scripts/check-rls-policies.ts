import { createClient } from '@supabase/supabase-js';
import { config } from '../config';

async function checkRLSPolicies() {
  console.log('Checking RLS policies on embedding_jobs table...\n');

  // Create a direct client with service role key
  const supabase = createClient(
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

  try {
    // Query to check if RLS is enabled on the table
    const { data: rlsStatus, error: rlsError } = await supabase
      .rpc('check_table_rls_status' as any, { table_name: 'embedding_jobs' })
      .single();

    if (rlsError) {
      console.log('Could not check RLS status via RPC, trying direct query...');
      
      // Try a direct SQL query
      const { data: sqlData, error: sqlError } = await supabase
        .from('pg_tables' as any)
        .select('*')
        .eq('schemaname', 'public')
        .eq('tablename', 'embedding_jobs')
        .single();
        
      if (sqlError) {
        console.error('Direct query also failed:', sqlError);
      } else {
        console.log('Table info:', sqlData);
      }
    } else {
      console.log('RLS Status:', rlsStatus);
    }

    // Try to query policies directly
    console.log('\nTrying to query policies...');
    const { data: policies, error: policiesError } = await supabase
      .from('pg_policies' as any)
      .select('*')
      .eq('schemaname', 'public')
      .eq('tablename', 'embedding_jobs');

    if (policiesError) {
      console.log('Could not query policies:', policiesError.message);
    } else {
      console.log('Policies found:', policies);
    }

    // Test with a raw SQL query using service role
    console.log('\nTesting raw SQL access...');
    const { data: rawData, error: rawError } = await supabase
      .rpc('execute_sql' as any, { 
        query: 'SELECT COUNT(*) FROM embedding_jobs;' 
      });

    if (rawError) {
      console.log('Raw SQL failed:', rawError.message);
      
      // Let's try a simpler approach - just check if we can access system tables
      console.log('\nChecking system table access...');
      const { data: tablesData, error: tablesError } = await supabase
        .from('information_schema.tables' as any)
        .select('table_name')
        .eq('table_schema', 'public')
        .eq('table_name', 'embedding_jobs');
        
      if (tablesError) {
        console.error('System table query failed:', tablesError);
      } else {
        console.log('Table exists in schema:', tablesData);
      }
    } else {
      console.log('Raw SQL result:', rawData);
    }

  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

// Run the check
checkRLSPolicies().catch(console.error);