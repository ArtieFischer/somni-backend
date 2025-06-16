import { config } from '../config';

async function testRAGDebug() {
  console.log('🔍 Testing RAG Debug Endpoints\n');
  
  // Test 1: Get RAG context for a dream
  console.log('1️⃣ Testing RAG Context Retrieval...\n');
  
  const contextRequest = {
    dreamTranscription: `I found myself in an ancient library filled with books that 
glowed with inner light. As I touched one, I transformed into a wise serpent 
and could understand the language of symbols. My shadow appeared as a guide, 
leading me deeper into the labyrinth of knowledge. The walls were covered with 
mandalas, and I could feel the presence of something numinous watching over me.`,
    interpreterType: 'jung'
  };

  try {
    const contextResponse = await fetch('http://localhost:3000/api/v1/rag-debug/context', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Secret': config.security.apiSecretKey
      },
      body: JSON.stringify(contextRequest)
    });

    const contextData = await contextResponse.json() as any;
    
    if (contextResponse.ok && contextData.success) {
      console.log('✅ RAG Context Retrieved!\n');
      console.log('📊 Summary:');
      console.log(`- Passages found: ${contextData.summary.passagesFound}`);
      console.log(`- Symbols extracted: ${contextData.summary.symbolsExtracted}`);
      console.log(`- Themes identified: ${contextData.summary.themesIdentified}`);
      
      if (contextData.passages.length > 0) {
        console.log('\n📚 Top Passages:');
        contextData.passages.slice(0, 3).forEach((passage: any) => {
          console.log(`\n${passage.rank}. From "${passage.source}"${passage.chapter ? ` - ${passage.chapter}` : ''}`);
          console.log(`   Similarity: ${passage.similarity}`);
          console.log(`   Content type: ${passage.contentType}`);
          console.log(`   Preview: ${passage.preview}`);
        });
      }
      
      if (contextData.symbols.length > 0) {
        console.log('\n🔮 Symbols Found:');
        contextData.symbols.forEach((symbol: any) => {
          console.log(`- ${symbol.symbol}: ${symbol.interpretations.length} interpretations`);
          if (symbol.interpretations[0]) {
            console.log(`  → "${symbol.interpretations[0].substring(0, 100)}..."`);
          }
        });
      }
      
      if (contextData.themes.length > 0) {
        console.log('\n🎭 Jungian Themes:', contextData.themes.join(', '));
      }
    } else {
      console.error('❌ Error:', contextData);
    }
  } catch (error) {
    console.error('❌ Context request failed:', error);
  }
  
  // Test 2: Get knowledge base statistics
  console.log('\n\n2️⃣ Testing Knowledge Base Statistics...\n');
  
  try {
    const statsResponse = await fetch('http://localhost:3000/api/v1/rag-debug/stats', {
      method: 'GET',
      headers: {
        'X-API-Secret': config.security.apiSecretKey
      }
    });

    const statsData = await statsResponse.json() as any;
    
    if (statsResponse.ok && statsData.success) {
      console.log('✅ Knowledge Base Statistics:\n');
      console.log(`Total entries: ${statsData.totalEntries}`);
      
      Object.entries(statsData.knowledgeBase || {}).forEach(([interpreter, stats]: [string, any]) => {
        console.log(`\n${interpreter.toUpperCase()}:`);
        console.log(`- Total passages: ${stats.total}`);
        console.log(`- Sources: ${stats.sources.join(', ')}`);
        console.log(`- Content types:`);
        Object.entries(stats.contentTypes).forEach(([type, count]) => {
          console.log(`  • ${type}: ${count}`);
        });
      });
    } else {
      console.error('❌ Error:', statsData);
    }
  } catch (error) {
    console.error('❌ Stats request failed:', error);
  }
  
  console.log('\n\n📝 Now run the full interpretation test to see enhanced logging:');
  console.log('   npm run test:rag-api');
  console.log('\n💡 Watch the server logs for detailed RAG information!');
}

testRAGDebug();