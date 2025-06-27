/**
 * Test single Jung interpreter
 */

import { modularThreeStageInterpreter } from '../services/modular-three-stage-interpreter';

const testDream = {
  id: 'test-dream-001',
  text: `I was in my childhood home, but it looked different - the walls were glass and I could see the ocean outside. My mother was there, but she was younger, maybe in her 30s. She was trying to tell me something important, but her words came out as colorful bubbles that floated away before I could read them.`,
  themes: ['home', 'ocean', 'mother', 'water']
};

async function testJung() {
  console.log('🔮 Testing JUNG Interpreter');
  
  const startTime = Date.now();
  const result = await modularThreeStageInterpreter.interpretDream({
    id: `${testDream.id}-jung`,
    text: testDream.text,
    themes: testDream.themes,
    interpreterType: 'jung',
    knowledgeFragments: []
  });
  
  if (result.success && result.data) {
    const interpretation = result.data;
    
    console.log('\n📊 INTERPRETATION RESULTS:');
    console.log('Topic:', interpretation.dreamTopic);
    console.log('Quick Take:', interpretation.quickTake);
    
    console.log('\n🔍 Symbols:', interpretation.symbols.join(', '));
    
    // Display emotions
    if (interpretation.emotionalTone) {
      console.log('\n🎭 Emotions:');
      console.log(`  - Primary: ${interpretation.emotionalTone.primary}`);
      console.log(`  - Secondary: ${interpretation.emotionalTone.secondary}`);
      console.log(`  - Intensity: ${(interpretation.emotionalTone.intensity * 100).toFixed(0)}%`);
    }
    
    console.log('\n💭 Condensed Interpretation:');
    console.log(interpretation.interpretation);
    
    console.log('\n❓ Self-Reflection Question:');
    console.log(interpretation.selfReflection);
    
    console.log(`\n⏱️ Processing Time: ${Date.now() - startTime}ms`);
  } else {
    console.log('❌ Interpretation failed:', result.error);
  }
  
  process.exit(0);
}

testJung().catch(console.error);