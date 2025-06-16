import { createClient } from '@supabase/supabase-js';
import { config } from '../config';
import { RAGService } from '../services/rag.service';
import { embeddingsService } from '../services/embeddings.service';

async function demonstrateRAG() {
  console.log('🔍 RAG Enhancement Demonstration\n');
  console.log('=' .repeat(80));

  const supabase = createClient(config.supabase.url, config.supabase.anonKey);
  const ragService = new RAGService(supabase);

  const sampleDream = `I found myself in an ancient library filled with books that 
glowed with inner light. As I touched one, I transformed into a wise serpent 
and could understand the language of symbols. My shadow appeared as a guide, 
leading me deeper into the labyrinth of knowledge.`;

  console.log('\n🌙 DREAM:');
  console.log(sampleDream);
  console.log('\n' + '=' .repeat(80) + '\n');

  try {
    // Get RAG context
    const context = await ragService.getRelevantContext(
      sampleDream,
      'jung',
      {
        maxResults: 3,
        similarityThreshold: 0.65,
        includeSymbols: true
      }
    );

    console.log('📚 RELEVANT JUNG PASSAGES FOUND:\n');
    
    if (context.relevantPassages.length > 0) {
      context.relevantPassages.forEach((passage, i) => {
        console.log(`${i + 1}. From "${passage.source}"${passage.chapter ? ` - ${passage.chapter}` : ''}`);
        console.log(`   "${passage.content.substring(0, 200)}..."`);
        console.log(`   Relevance: ${(passage.similarity * 100).toFixed(1)}%\n`);
      });

      console.log('🎯 HOW THIS ENHANCES THE INTERPRETATION:');
      console.log('- Jung\'s actual writings about libraries, serpents, and shadow are included');
      console.log('- The interpreter can reference specific Jung concepts from these passages');
      console.log('- Interpretations become more authentic and grounded in Jungian theory\n');

      if (context.symbols.length > 0) {
        console.log('🔮 SYMBOLS EXTRACTED:');
        context.symbols.forEach(s => {
          console.log(`- ${s.symbol}: ${s.interpretations[0] || 'Symbol found in texts'}`);
        });
        console.log('');
      }

      console.log('💡 EXAMPLE ENHANCED RESPONSE:');
      console.log('"As I contemplate your dream, I\'m reminded of similar journeys into');
      console.log('the depths of knowledge that I\'ve encountered in my work. The ancient');
      console.log('library represents the collective unconscious, where all human wisdom');
      console.log(`resides. ${context.relevantPassages[0] ? 'In my own experiences, ' + context.relevantPassages[0].content.substring(0, 100) + '...' : ''}`);
      console.log('\nThe serpent transformation is particularly significant..."');

    } else {
      console.log('No specific passages found for this dream, but the system is working!');
      console.log('The interpreter would use general Jungian knowledge.');
    }

    console.log('\n' + '=' .repeat(80));
    console.log('\n✅ When ENABLE_RAG=true, all Jung interpretations automatically include');
    console.log('   this contextual knowledge from Jung\'s actual writings!\n');

  } catch (error) {
    console.error('Error:', error);
  }

  // Cleanup
  await embeddingsService.cleanup();
  process.exit(0);
}

demonstrateRAG();