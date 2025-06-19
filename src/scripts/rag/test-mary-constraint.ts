import { createClient } from '@supabase/supabase-js';
import { config } from '../../config';

async function testMaryConstraint() {
  const supabase = createClient(
    config.supabase.url,
    config.supabase.serviceRoleKey
  );

  console.log('Testing knowledge_base table constraint...\n');

  // Test inserting a minimal record with interpreter_type 'mary'
  const testRecord = {
    interpreter_type: 'mary',
    source: 'Test Source',
    content: 'Test content for Mary interpreter',
    content_type: 'theory',
    metadata: { test: true },
    embedding: new Array(384).fill(0) // Dummy embedding
  };

  const { data, error } = await supabase
    .from('knowledge_base')
    .insert(testRecord)
    .select();

  if (error) {
    console.error('❌ Error inserting test record:', error);
    
    if (error.code === '23514') {
      console.log('\n⚠️  The database constraint does not allow "mary" as an interpreter type.');
      console.log('The constraint needs to be updated to include "mary".');
      console.log('\nPlease run the following SQL in your Supabase SQL editor:');
      console.log('----------------------------------------');
      console.log(`ALTER TABLE knowledge_base 
DROP CONSTRAINT IF EXISTS valid_interpreter;

ALTER TABLE knowledge_base 
ADD CONSTRAINT valid_interpreter CHECK (
  interpreter_type IN ('jung', 'freud', 'mary', 'universal')
);`);
      console.log('----------------------------------------');
    }
  } else {
    console.log('✅ Successfully inserted test record with interpreter_type "mary"');
    console.log('The constraint is correctly configured.');
    
    // Clean up test record
    if (data && data[0]) {
      const { error: deleteError } = await supabase
        .from('knowledge_base')
        .delete()
        .eq('id', data[0].id);
      
      if (!deleteError) {
        console.log('✅ Test record cleaned up');
      }
    }
  }

  // Also test what interpreter types currently exist
  const { data: interpreters, error: queryError } = await supabase
    .from('knowledge_base')
    .select('interpreter_type')
    .limit(10);

  if (!queryError && interpreters) {
    const uniqueInterpreters = [...new Set(interpreters.map(r => r.interpreter_type))];
    console.log('\nExisting interpreter types in database:', uniqueInterpreters);
  }
}

// Run the test
if (require.main === module) {
  testMaryConstraint()
    .then(() => {
      console.log('\nTest complete');
      process.exit(0);
    })
    .catch(error => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}