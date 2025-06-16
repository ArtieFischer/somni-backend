import { createClient } from '@supabase/supabase-js';
import { config } from '../config';
import { RAGService } from '../services/rag.service';
import { embeddingsService } from '../services/embeddings.service';

async function testRAG() {
  console.log('🧪 Testing RAG Integration...\n');

  const supabase = createClient(config.supabase.url, config.supabase.anonKey);
  
  // First, check how many Jung entries we have
  const { count, error: countError } = await supabase
    .from('knowledge_base')
    .select('*', { count: 'exact', head: true })
    .eq('interpreter_type', 'jung');

  if (countError) {
    console.error('❌ Error checking database:', countError);
    return;
  }

  console.log(`✅ Found ${count} Jung knowledge entries in database\n`);

  // Now test the RAG service with a sample dream
  const ragService = new RAGService(supabase);
  
  const sampleDream = `I dreamed I was in a dark forest, and suddenly I encountered 
  my shadow self. We had a conversation about my fears and then merged into one. 
  There was a bright light and I woke up feeling transformed.`;

  console.log('🔍 Testing with sample dream:');
  console.log(`"${sampleDream}"\n`);

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

    console.log(`📚 Retrieved ${context.relevantPassages.length} relevant passages:\n`);
    
    context.relevantPassages.forEach((passage, i) => {
      console.log(`${i + 1}. From "${passage.source}"${passage.chapter ? ` - ${passage.chapter}` : ''}`);
      console.log(`   Content: "${passage.content.substring(0, 150)}..."`);
      console.log(`   Type: ${passage.contentType}`);
      console.log(`   Similarity: ${(passage.similarity * 100).toFixed(1)}%\n`);
    });

    if (context.symbols.length > 0) {
      console.log('🔮 Symbols found:');
      context.symbols.forEach(s => {
        console.log(`- ${s.symbol}: ${s.interpretations[0] || 'No specific interpretation found'}`);
      });
    }

    if (context.themes.length > 0) {
      console.log('\n🎭 Themes identified:', context.themes.join(', '));
    }

  } catch (error) {
    console.error('❌ Error testing RAG:', error);
  }

  // Cleanup
  await embeddingsService.cleanup();
  process.exit(0);
}

testRAG();