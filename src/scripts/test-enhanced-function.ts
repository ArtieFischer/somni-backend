import { createClient } from '@supabase/supabase-js';
import { config } from '../config/index.js';
import { embeddingsService } from '../services/embeddings.service.js';

async function testEnhancedFunction() {
  console.log('🧪 Testing enhanced search_knowledge function...\n');

  const supabase = createClient(config.supabase.url, config.supabase.serviceRoleKey);
  
  // Generate a test embedding
  const testEmbedding = await embeddingsService.generateEmbedding('dream nightmare anxiety');
  
  console.log('1️⃣ Testing basic 4-parameter call (backwards compatibility)...');
  const { data: basicData, error: basicError } = await supabase.rpc('search_knowledge', {
    query_embedding: testEmbedding,
    target_interpreter: 'freud',
    similarity_threshold: 0.5,
    max_results: 3
  });
  
  if (basicError) {
    console.error('❌ Basic call failed:', basicError);
  } else {
    console.log(`✅ Basic call succeeded - found ${basicData?.length || 0} results`);
  }
  
  console.log('\n2️⃣ Testing enhanced 6-parameter call with metadata filter...');
  const metadataFilter = { topic: 'dream' };
  const { data: enhancedData, error: enhancedError } = await supabase.rpc('search_knowledge', {
    query_embedding: testEmbedding,
    target_interpreter: 'freud',
    similarity_threshold: 0.5,
    max_results: 3,
    metadata_filter: JSON.stringify(metadataFilter),
    boost_config: null
  });
  
  if (enhancedError) {
    console.error('❌ Enhanced call failed:', enhancedError);
    console.error('Full error:', JSON.stringify(enhancedError, null, 2));
  } else {
    console.log(`✅ Enhanced call succeeded - found ${enhancedData?.length || 0} results`);
    if (enhancedData && enhancedData.length > 0) {
      console.log('\nFirst result:');
      console.log(`  Source: ${enhancedData[0].source}`);
      console.log(`  Topic: ${enhancedData[0].metadata?.topic}`);
      console.log(`  Similarity: ${enhancedData[0].similarity}`);
    }
  }
  
  // Cleanup
  await embeddingsService.cleanup();
}

testEnhancedFunction().catch(console.error);