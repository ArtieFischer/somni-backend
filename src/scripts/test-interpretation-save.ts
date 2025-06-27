import { createClient } from '@supabase/supabase-js';
import { config } from '../config';

async function testInterpretationSave() {
  console.log('Testing interpretation save with service role...\n');

  // Create service role client
  const supabase = createClient(
    config.supabase.url,
    config.supabase.serviceRoleKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );

  // Test data matching your actual interpretation structure
  const testInterpretation = {
    dream_id: 'add2cebd-35fa-4370-9a6b-2487352e20e0',
    user_id: '564e51c6-6e2b-41f1-a970-b68ad9e9e56d',
    interpreter_type: 'freud',
    interpretation_summary: 'Test interpretation summary',
    full_response: {
      dreamId: 'add2cebd-35fa-4370-9a6b-2487352e20e0',
      interpreterType: 'freud',
      interpretation: 'Test interpretation',
      fullInterpretation: 'Test full interpretation',
      symbols: ['test'],
      emotionalTone: { primary: 'test', intensity: 0.5 },
      primaryInsight: 'Test insight',
      keyPattern: 'Test pattern'
    },
    dream_topic: 'Test Topic',
    quick_take: 'Test quick take',
    symbols: ['test', 'symbols'],
    emotional_tone: { primary: 'test', intensity: 0.5 },
    primary_insight: 'Test primary insight',
    key_pattern: 'Test key pattern',
    knowledge_fragments_used: 0,
    total_fragments_retrieved: 0,
    fragment_ids_used: [],
    processing_time_ms: 1000,
    model_used: 'gpt-4o',
    version: 1
  };

  console.log('Test 1: Check current RLS policies');
  console.log('=' .repeat(50));
  
  const { data: policies, error: policiesError } = await supabase
    .rpc('get_table_policies', { table_name: 'interpretations' });
    
  if (policiesError) {
    console.error('❌ Failed to get policies:', policiesError);
  } else if (policies) {
    console.log('Current policies:');
    policies.forEach((policy: any) => {
      console.log(`- ${policy.policyname}: ${policy.cmd} (${policy.permissive})`);
    });
  }

  console.log('\n\nTest 2: Attempt to insert interpretation');
  console.log('=' .repeat(50));
  
  const { data, error } = await supabase
    .from('interpretations')
    .insert(testInterpretation)
    .select()
    .single();
    
  if (error) {
    console.error('❌ Insert failed:', error.message);
    console.error('Error code:', error.code);
    console.error('Error details:', error.details);
    console.error('Error hint:', error.hint);
    
    if (error.code === '42501') {
      console.log('\n⚠️  This is a permissions error. Please run the fix-interpretations-rls-service-role.sql file in Supabase SQL editor.');
    }
  } else {
    console.log('✅ Insert succeeded!');
    console.log('Interpretation ID:', data.id);
    console.log('Created at:', data.created_at);
  }

  console.log('\n\nTest 3: Verify service role authentication');
  console.log('=' .repeat(50));
  
  // Check if we can access a protected table
  const { data: dreamData, error: dreamError } = await supabase
    .from('dreams')
    .select('id')
    .limit(1);
    
  if (dreamError) {
    console.error('❌ Dreams access failed:', dreamError.message);
  } else {
    console.log('✅ Can access dreams table');
  }

  // Clean up test data if insert was successful
  if (data) {
    console.log('\n\nCleaning up test data...');
    const { error: deleteError } = await supabase
      .from('interpretations')
      .delete()
      .eq('id', data.id);
      
    if (deleteError) {
      console.error('Failed to clean up:', deleteError.message);
    } else {
      console.log('✅ Test data cleaned up');
    }
  }
}

// Run the test
testInterpretationSave()
  .then(() => {
    console.log('\n\nTest completed.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Test failed:', error);
    process.exit(1);
  });