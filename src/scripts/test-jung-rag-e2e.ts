import { dreamInterpretationService } from '../prompts/service.js';
import type { InterpretationRequest } from '../types/index.js';

async function testJungRAGEndToEnd() {
  console.log('🧪 Testing Jung RAG End-to-End...\n');
  
  const testRequest: InterpretationRequest = {
    dreamId: 'test-rag-001',
    dreamTranscription: `I dreamed I was in a dark forest, and suddenly I encountered 
    my shadow self. We had a conversation about my fears and then merged into one. 
    There was a bright light and I woke up feeling transformed.`,
    interpreterType: 'jung',
    analysisDepth: 'initial',
    userContext: {
      age: 35,
      currentLifeSituation: 'Going through major life transition',
      emotionalState: 'Anxious but hopeful'
    },
    testMode: true  // Enable to see debug info
  };
  
  console.log('🌙 Interpreting dream with Jung + RAG...\n');
  
  try {
    const response = await dreamInterpretationService.interpretDream(testRequest);
    
    if (response.success) {
      console.log('✅ Interpretation successful!');
      console.log(`📊 Model used: ${response.metadata?.modelUsed || 'N/A'}`);
      console.log(`⏱️ Duration: ${response.metadata?.duration || 'N/A'}ms`);
      console.log(`🪙 Tokens used: ${response.metadata?.tokenUsage?.totalTokens || 'N/A'}\n`);
      
      // Check if interpretation mentions shadow or uses Jung's concepts
      const interpretation = response.interpretation;
      const hasJungianConcepts = 
        JSON.stringify(interpretation).toLowerCase().includes('shadow') ||
        JSON.stringify(interpretation).toLowerCase().includes('individuation') ||
        JSON.stringify(interpretation).toLowerCase().includes('unconscious');
      
      console.log(`🔮 Contains Jungian concepts: ${hasJungianConcepts}`);
      
      // Show interpretation preview
      console.log('\n📖 Interpretation Preview:');
      if (interpretation && 'interpretation' in interpretation) {
        console.log(interpretation.interpretation.substring(0, 300) + '...');
      }
      
      // Show symbols if available
      if (interpretation && 'symbols' in interpretation && Array.isArray(interpretation.symbols)) {
        console.log(`\n🔮 Symbols found: ${interpretation.symbols.join(', ')}`);
      }
      
      // Check for debate process (in test mode)
      if ('debateProcess' in response && response.debateProcess) {
        console.log('\n🎭 Debate process included (test mode)');
      }
      
    } else {
      console.error('❌ Interpretation failed:', response.error);
    }
  } catch (error) {
    console.error('💥 Error:', error);
  }
}

// Run the test
testJungRAGEndToEnd().catch(console.error);