/**
 * Test emotions display and self-reflection questions for all interpreters
 */

import { modularThreeStageInterpreter } from '../services/modular-three-stage-interpreter';
import { InterpreterType } from '../types';

const testDream = {
  id: 'test-dream-emotions',
  text: `I was in my childhood home, but the walls were glass. My mother was there, younger, speaking in colorful bubbles that floated away.`,
  themes: ['home', 'mother', 'glass', 'bubbles']
};

async function testInterpreter(interpreterType: InterpreterType) {
  console.log(`\n🔮 Testing ${interpreterType.toUpperCase()}`);
  console.log('─'.repeat(40));
  
  const result = await modularThreeStageInterpreter.interpretDream({
    id: `${testDream.id}-${interpreterType}`,
    text: testDream.text,
    themes: testDream.themes,
    interpreterType,
    knowledgeFragments: []
  });
  
  if (result.success && result.data) {
    const interpretation = result.data;
    
    // Display emotions
    if (interpretation.emotionalTone) {
      console.log('🎭 Emotions:');
      console.log(`  Primary: ${interpretation.emotionalTone.primary}`);
      console.log(`  Secondary: ${interpretation.emotionalTone.secondary}`);
      console.log(`  Intensity: ${(interpretation.emotionalTone.intensity * 100).toFixed(0)}%`);
    }
    
    // Display self-reflection question
    console.log('\n❓ Self-Reflection Question:');
    console.log(`"${interpretation.selfReflection}"`);
    console.log(`(${interpretation.selfReflection.split(' ').length} words)`);
  } else {
    console.log('❌ Failed:', result.error);
  }
}

async function testAll() {
  console.log('🧪 Testing Emotions & Self-Reflection Questions\n');
  console.log('Dream:', testDream.text);
  
  const interpreters: InterpreterType[] = ['jung', 'lakshmi', 'freud', 'mary'];
  
  for (const type of interpreters) {
    await testInterpreter(type);
  }
  
  console.log('\n✅ Test complete!');
  process.exit(0);
}

testAll().catch(console.error);