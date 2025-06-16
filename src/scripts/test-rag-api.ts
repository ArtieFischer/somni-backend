import { config } from '../config';

async function testRAGAPI() {
  console.log('🧪 Testing Jung Interpreter with RAG Enhancement\n');
  
  const dreamId = crypto.randomUUID();
  console.log(`Dream ID: ${dreamId}`);
  
  const requestBody = {
    dreamId,
    interpreterType: 'jung',
    dreamTranscription: `I found myself in an ancient library filled with books that 
glowed with inner light. As I touched one, I transformed into a wise serpent 
and could understand the language of symbols. My shadow appeared as a guide, 
leading me deeper into the labyrinth of knowledge.`,
    analysisDepth: 'deep',
    userContext: {
      age: 35,
      currentLifeSituation: 'Seeking deeper understanding of myself'
    }
  };

  try {
    const response = await fetch('http://localhost:3000/api/v1/interpretation/test/interpret', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Secret': config.security.apiSecretKey
      },
      body: JSON.stringify(requestBody)
    });

    const data = await response.json() as any;
    
    if (response.ok && data.success) {
      console.log('\n✅ SUCCESS! Jung interpretation received\n');
      
      // The interpretation is nested under 'interpretation'
      if (data.interpretation) {
        const interp = data.interpretation;
        
        if ('type' in interp && interp.type === 'jungian') {
          // New JungianInsights format
          console.log('🌙 Jung Insights:');
          console.log('\nOpening:', interp.phenomenologicalOpening);
          console.log('\nCore Message:', interp.coreMessage);
          console.log('\nSymbols:', interp.symbols);
          console.log('\nIndividuation Guidance:', interp.individuationGuidance);
          console.log('\nCompensatory Function:', interp.compensatoryFunction);
        } else if ('dreamTopic' in interp) {
          // Old DreamAnalysis format
          console.log('🔮 Dream Analysis:');
          console.log('\nTopic:', interp.dreamTopic);
          console.log('\nQuick Take:', interp.quickTake);
          console.log('\nInterpretation:', interp.interpretation);
          console.log('\nDream Work:', interp.dreamWork);
          console.log('\nSelf Reflection:', interp.selfReflection);
          console.log('\nSymbols:', interp.symbols);
        }
      }
      
      // Check if we can see RAG influence in the aiResponse
      if (data.aiResponse) {
        const hasJungReferences = data.aiResponse.includes('Jung') || 
                                data.aiResponse.includes('my work') ||
                                data.aiResponse.includes('From');
        console.log('\n📚 RAG Enhancement:', hasJungReferences ? '✅ Likely used' : '❌ Not detected');
      }
      
      if (data.metadata) {
        console.log('\n📊 Metadata:');
        console.log('- Model used:', data.metadata?.modelUsed);
        console.log('- Processing time:', data.metadata?.duration, 'ms');
      }
      
      console.log('\n💡 To verify RAG was used, check your server logs for:');
      console.log('   "Retrieved X relevant passages for Jung interpretation"');
      console.log('\n🔍 Note: The response uses the older DreamAnalysis format.');
      console.log('   RAG context would be visible in the actual interpretation text.');
      
    } else {
      console.error('\n❌ Error:', data);
    }
  } catch (error) {
    console.error('\n❌ Request failed:', error);
  }
}

testRAGAPI();