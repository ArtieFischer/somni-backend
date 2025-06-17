import { createClient } from '@supabase/supabase-js';
import { config } from '../config/index.js';
import { RAGService } from '../services/rag.service.js';
import { embeddingsService } from '../services/embeddings.service.js';

async function debugRAGIssue() {
  console.log('🔍 Debugging RAG Issue...\n');

  // Create supabase client with service role key for full access
  const supabase = createClient(config.supabase.url, config.supabase.serviceRoleKey);
  
  // 1. First check if we have any knowledge base entries
  const { count: totalCount, error: totalError } = await supabase
    .from('knowledge_base')
    .select('*', { count: 'exact', head: true });

  if (totalError) {
    console.error('❌ Error checking total knowledge base:', totalError);
    return;
  }

  console.log(`📊 Total knowledge base entries: ${totalCount}`);

  // 2. Check Jung-specific entries
  const { count: jungCount, error: jungError } = await supabase
    .from('knowledge_base')
    .select('*', { count: 'exact', head: true })
    .eq('interpreter_type', 'jung');

  if (jungError) {
    console.error('❌ Error checking Jung entries:', jungError);
    return;
  }

  console.log(`📚 Jung-specific entries: ${jungCount}\n`);

  // 3. Get a sample of Jung entries to check structure
  const { data: sampleEntries, error: sampleError } = await supabase
    .from('knowledge_base')
    .select('id, content, source, chapter, content_type, interpreter_type')
    .eq('interpreter_type', 'jung')
    .limit(3);

  if (sampleError) {
    console.error('❌ Error getting sample entries:', sampleError);
  } else {
    console.log('📝 Sample Jung entries:');
    sampleEntries?.forEach((entry, i) => {
      console.log(`${i + 1}. ID: ${entry.id}`);
      console.log(`   Source: ${entry.source}`);
      console.log(`   Chapter: ${entry.chapter || 'N/A'}`);
      console.log(`   Content Type: ${entry.content_type}`);
      console.log(`   Content: "${entry.content.substring(0, 100)}..."\n`);
    });
  }

  // 4. Test embedding generation
  console.log('🧮 Testing embedding generation...');
  const testText = "I dreamed about my shadow self in a dark forest";
  
  try {
    const embedding = await embeddingsService.generateEmbedding(testText);
    console.log(`✅ Successfully generated embedding with ${embedding.length} dimensions\n`);
  } catch (error) {
    console.error('❌ Error generating embedding:', error);
    return;
  }

  // 5. Test the RPC function directly
  console.log('🔧 Testing search_knowledge RPC function directly...');
  
  try {
    const testEmbedding = await embeddingsService.generateEmbedding(testText);
    
    const { data: rpcResult, error: rpcError } = await supabase.rpc('search_knowledge', {
      query_embedding: testEmbedding,
      target_interpreter: 'jung',
      similarity_threshold: 0.5,
      max_results: 5
    });

    if (rpcError) {
      console.error('❌ RPC function error:', rpcError);
      console.error('Error details:', JSON.stringify(rpcError, null, 2));
      
      // Check if function exists
      // Check available functions in the database
      const { data: functions } = await supabase
        .from('pg_proc')
        .select('proname')
        .filter('proname', 'ilike', '%search%');
        
      console.log('\n🔍 Available functions with "search" in name:', functions);
    } else {
      console.log(`✅ RPC function returned ${rpcResult?.length || 0} results`);
      if (rpcResult && rpcResult.length > 0) {
        console.log('\nFirst result:', {
          content: rpcResult[0].content.substring(0, 100) + '...',
          similarity: rpcResult[0].similarity
        });
      }
    }
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }

  // 6. Test RAG service
  console.log('\n🧪 Testing RAG Service...');
  const ragService = new RAGService(supabase);
  
  const sampleDream = `I dreamed I was in a dark forest, and suddenly I encountered 
  my shadow self. We had a conversation about my fears and then merged into one. 
  There was a bright light and I woke up feeling transformed.`;

  try {
    const context = await ragService.getRelevantContext(
      sampleDream,
      'jung',
      {
        maxResults: 5,
        similarityThreshold: 0.6,
        includeSymbols: true
      }
    );

    console.log(`\n📚 RAG Service Results:`);
    console.log(`- Retrieved ${context.relevantPassages.length} passages`);
    console.log(`- Found ${context.symbols.length} symbols`);
    console.log(`- Identified ${context.themes.length} themes`);
    
    if (context.relevantPassages.length > 0) {
      const firstPassage = context.relevantPassages[0];
      if (firstPassage) {
        console.log('\nFirst passage:', {
          source: firstPassage.source,
          content: firstPassage.content.substring(0, 150) + '...',
          similarity: firstPassage.similarity
        });
      }
    }
  } catch (error) {
    console.error('❌ RAG Service error:', error);
  }

  // Cleanup
  await embeddingsService.cleanup();
  console.log('\n✅ Debug complete');
}

// Run the debug script
debugRAGIssue().catch(console.error);