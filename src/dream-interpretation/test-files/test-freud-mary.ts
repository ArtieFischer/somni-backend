/**
 * Test Freud and Mary interpreters
 */

import { modularThreeStageInterpreter } from '../services/modular-three-stage-interpreter';

const testDream = {
  id: 'test-dream-fm',
  text: `I was in my childhood home, but it looked different - the walls were glass and I could see the ocean outside. My mother was there, but she was younger. She was trying to tell me something important, but her words came out as bubbles. I felt frustrated trying to catch them. Then the floor turned into water and I found I could breathe underwater.`,
  themes: ['family', 'communication', 'transformation']
};

async function testFreudMary() {
  console.log('🧪 Testing Freud and Mary Interpreters\n');
  
  // Test Freud
  console.log('=== FREUD ===');
  try {
    const freudResult = await modularThreeStageInterpreter.interpretDream({
      dreamId: testDream.id + '-freud',
      userId: 'test-user',
      dreamTranscription: testDream.text,
      interpreterType: 'freud',
      themes: testDream.themes.map(t => ({ code: t, name: t, relevanceScore: 0.8 })),
      userContext: { age: 35 }
    });
    
    if (freudResult.success && freudResult.data) {
      console.log('✅ Success!');
      console.log('Topic:', freudResult.data.dreamTopic);
      console.log('\nInterpretation:');
      console.log(freudResult.data.interpretation);
      console.log('\nSelf-reflection:', freudResult.data.selfReflection);
      
      // Count domain terms
      const freudTerms = ['unconscious', 'repression', 'id', 'ego', 'superego', 'libido', 'transference', 'complex', 'defense mechanism', 'wish-fulfillment'];
      const usedTerms = freudTerms.filter(term => 
        freudResult.data.interpretation.toLowerCase().includes(term.toLowerCase())
      );
      console.log('\nDomain terms used:', usedTerms.length, '-', usedTerms.join(', '));
    } else {
      console.error('❌ Error:', freudResult.error);
    }
  } catch (error) {
    console.error('❌ Freud Error:', error);
    if (error instanceof Error) {
      console.error('Stack:', error.stack);
    }
  }
  
  console.log('\n=== MARY ===');
  // Test Mary
  try {
    const maryResult = await modularThreeStageInterpreter.interpretDream({
      dreamId: testDream.id + '-mary',
      userId: 'test-user', 
      dreamTranscription: testDream.text,
      interpreterType: 'mary',
      themes: testDream.themes.map(t => ({ code: t, name: t, relevanceScore: 0.8 })),
      userContext: { age: 35 }
    });
    
    if (maryResult.success && maryResult.data) {
      console.log('✅ Success!');
      console.log('Topic:', maryResult.data.dreamTopic);
      console.log('\nInterpretation:');
      console.log(maryResult.data.interpretation);
      console.log('\nSelf-reflection:', maryResult.data.selfReflection);
      
      // Count domain terms
      const maryTerms = ['hippocampus', 'amygdala', 'prefrontal cortex', 'REM sleep', 'consolidation', 'neural plasticity', 'neurotransmitter', 'activation-synthesis'];
      const usedTerms = maryTerms.filter(term => 
        maryResult.data.interpretation.toLowerCase().includes(term.toLowerCase())
      );
      console.log('\nDomain terms used:', usedTerms.length, '-', usedTerms.join(', '));
    } else {
      console.error('❌ Error:', maryResult.error);
    }
  } catch (error) {
    console.error('❌ Mary Error:', error);
    if (error instanceof Error) {
      console.error('Stack:', error.stack);
    }
  }
}

testFreudMary().catch(console.error);