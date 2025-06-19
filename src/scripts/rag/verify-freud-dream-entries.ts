import { createClient } from '@supabase/supabase-js';
import { config } from '../../config/index.js';

async function verifyFreudDreamEntries() {
  console.log('🔍 Verifying Freud dream entries...\n');

  const supabase = createClient(config.supabase.url, config.supabase.serviceRoleKey);
  
  // Check entries with topic='dream' - get all and filter in JS
  const { data: allFreudEntries, error } = await supabase
    .from('knowledge_base')
    .select('source, metadata')
    .eq('interpreter_type', 'freud');
    
  if (error) {
    console.error('Error querying:', error);
    return;
  }
  
  const dreamEntries = allFreudEntries?.filter(entry => 
    entry.metadata && entry.metadata.topic === 'dream'
  ) || [];
  
  const count = dreamEntries.length;

  console.log(`✅ Found ${count} total entries with topic="dream"`);
  
  // Count by source
  const sourceCount = new Map<string, number>();
  dreamEntries?.forEach(entry => {
    const source = entry.source;
    sourceCount.set(source, (sourceCount.get(source) || 0) + 1);
  });
  
  console.log('\n📚 Dream entries by source:');
  for (const [source, cnt] of sourceCount) {
    console.log(`   ${source}: ${cnt} entries`);
  }
  
  // Test a simple query
  console.log('\n🧪 Testing basic query (no metadata filter)...');
  const { data: basicResults, error: basicError } = await supabase
    .from('knowledge_base')
    .select('id, source, content')
    .eq('interpreter_type', 'freud')
    .limit(5);
    
  if (!basicError && basicResults) {
    console.log(`✅ Basic query works - found ${basicResults.length} entries`);
  } else {
    console.error('❌ Basic query failed:', basicError);
  }
  
  // Test the search function
  console.log('\n🧪 Testing search_knowledge function...');
  const { embeddingsService } = await import('../../services/embeddings.service.js');
  const testEmbedding = await embeddingsService.generateEmbedding('nightmare trauma war');
  
  // Test basic search first
  const { data: searchResults, error: searchError } = await supabase.rpc('search_knowledge', {
    query_embedding: testEmbedding,
    target_interpreter: 'freud',
    similarity_threshold: 0.5,
    max_results: 5
  });
  
  if (!searchError && searchResults) {
    console.log(`✅ Basic search works - found ${searchResults.length} results`);
    if (searchResults.length > 0) {
      console.log('\nFirst result:');
      console.log(`   Source: ${searchResults[0].source}`);
      console.log(`   Similarity: ${searchResults[0].similarity}`);
    }
  } else {
    console.error('❌ Basic search failed:', searchError);
  }
  
  // Test enhanced search with metadata filter
  console.log('\n🧪 Testing enhanced search with metadata filter...');
  const { data: enhancedResults, error: enhancedError } = await supabase.rpc('search_knowledge', {
    query_embedding: testEmbedding,
    target_interpreter: 'freud',
    similarity_threshold: 0.5,
    max_results: 5,
    metadata_filter: JSON.stringify({ topic: 'dream' }),
    boost_config: JSON.stringify({ subtopic: ['trauma', 'anxiety'] })
  });
  
  if (!enhancedError && enhancedResults) {
    console.log(`✅ Enhanced search works - found ${enhancedResults.length} results`);
    if (enhancedResults.length > 0) {
      console.log('\nFirst result with filter:');
      console.log(`   Source: ${enhancedResults[0].source}`);
      console.log(`   Metadata: ${JSON.stringify(enhancedResults[0].metadata)}`);
      console.log(`   Similarity: ${enhancedResults[0].similarity}`);
    }
  } else {
    console.error('❌ Enhanced search failed:', enhancedError);
  }
}

verifyFreudDreamEntries().catch(console.error);