import { createClient } from '@supabase/supabase-js';
import { config } from '../config/index.js';

async function testMetadataFilter() {
  console.log('🧪 Testing metadata filtering directly...\n');

  const supabase = createClient(config.supabase.url, config.supabase.serviceRoleKey);
  
  // First, let's check what's in the metadata for a known dream source
  console.log('1️⃣ Checking raw metadata from interpretation-of-dreams...');
  const { data: sampleData, error: sampleError } = await supabase
    .from('knowledge_base')
    .select('id, metadata')
    .eq('interpreter_type', 'freud')
    .eq('source', 'interpretation-of-dreams')
    .limit(1);
    
  if (!sampleError && sampleData && sampleData.length > 0) {
    const firstEntry = sampleData[0];
    if (firstEntry) {
      console.log('Sample metadata:', JSON.stringify(firstEntry.metadata, null, 2));
      console.log('metadata type:', typeof firstEntry.metadata);
    }
  }
  
  // Test JSONB containment operator in Supabase
  console.log('\n2️⃣ Testing JSONB containment with Supabase...');
  
  // Try different approaches
  const tests = [
    {
      name: 'Direct filter with match',
      query: supabase
        .from('knowledge_base')
        .select('id, source, metadata')
        .eq('interpreter_type', 'freud')
        .match({ 'metadata': { topic: 'dream' } })
        .limit(3)
    },
    {
      name: 'Using contains',
      query: supabase
        .from('knowledge_base')
        .select('id, source, metadata')
        .eq('interpreter_type', 'freud')
        .contains('metadata', { topic: 'dream' })
        .limit(3)
    },
    {
      name: 'Using RPC with raw SQL',
      query: supabase.rpc('test_metadata_filter', {})
    }
  ];
  
  for (const test of tests) {
    console.log(`\n🔍 ${test.name}:`);
    const { data, error } = await test.query;
    
    if (error) {
      console.error(`❌ Error: ${error.message}`);
    } else {
      console.log(`✅ Found ${data?.length || 0} results`);
      if (data && data.length > 0) {
        console.log(`   First result source: ${data[0].source}`);
      }
    }
  }
  
  // Create a test function to check metadata filtering
  console.log('\n3️⃣ Creating and testing a simple metadata check function...');
  
  const createTestFunction = `
    CREATE OR REPLACE FUNCTION test_metadata_filter()
    RETURNS TABLE (
      id bigint,
      source text,
      metadata jsonb,
      has_dream_topic boolean
    )
    LANGUAGE plpgsql
    AS $$
    BEGIN
      RETURN QUERY
      SELECT 
        kb.id,
        kb.source,
        kb.metadata,
        (kb.metadata->>'topic' = 'dream') as has_dream_topic
      FROM knowledge_base kb
      WHERE 
        kb.interpreter_type = 'freud'
        AND kb.source = 'interpretation-of-dreams'
      LIMIT 5;
    END;
    $$;
  `;
  
  console.log('\nTo debug further, run this SQL in Supabase SQL editor:');
  console.log(createTestFunction);
  console.log('\nThen: SELECT * FROM test_metadata_filter();');
  
  // Test raw SQL to see what's happening
  console.log('\n4️⃣ Key SQL queries to run in Supabase:');
  console.log(`
-- Check metadata structure
SELECT id, source, metadata, metadata->>'topic' as topic
FROM knowledge_base 
WHERE interpreter_type = 'freud' 
AND source = 'interpretation-of-dreams'
LIMIT 5;

-- Test JSONB containment
SELECT COUNT(*) as dream_count
FROM knowledge_base
WHERE interpreter_type = 'freud'
AND metadata @> '{"topic": "dream"}'::jsonb;

-- Check what topics exist
SELECT DISTINCT metadata->>'topic' as topic, COUNT(*) as count
FROM knowledge_base
WHERE interpreter_type = 'freud'
GROUP BY metadata->>'topic'
ORDER BY count DESC;
  `);
}

testMetadataFilter().catch(console.error);