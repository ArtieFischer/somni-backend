/**
 * Test specific dream-referenced self-reflection questions
 */

import { modularThreeStageInterpreter } from '../services/modular-three-stage-interpreter';
import { InterpreterType } from '../types';

const testDream = {
  id: 'test-dream-specific',
  text: `I was in my childhood home, but the walls were glass. My mother was there, younger, speaking in colorful bubbles that floated away. I tried to catch them but they dissolved. The floor turned to water and I found I could breathe underwater.`,
  themes: ['home', 'mother', 'glass', 'bubbles', 'water']
};

async function testInterpreter(interpreterType: InterpreterType) {
  console.log(`\n🔮 Testing ${interpreterType.toUpperCase()}`);
  console.log('─'.repeat(40));
  
  const result = await modularThreeStageInterpreter.interpretDream({
    dreamId: `${testDream.id}-${interpreterType}`,
    userId: 'test-user',
    dreamTranscription: testDream.text,
    themes: testDream.themes.map(theme => ({
      code: theme,
      name: theme.charAt(0).toUpperCase() + theme.slice(1),
      relevanceScore: 0.8
    })),
    interpreterType,
    userContext: {
      age: 35,
      currentLifeSituation: 'Testing dream interpretation',
      emotionalState: 'Curious'
    }
  });
  
  if (result.success && result.data) {
    const interpretation = result.data;
    
    // Display self-reflection question
    console.log('❓ Self-Reflection Question:');
    console.log(`"${interpretation.selfReflection}"`);
    console.log(`(${interpretation.selfReflection.split(' ').length} words)`);
    
    // Check if it references specific dream elements
    const dreamElements = ['glass', 'walls', 'mother', 'bubbles', 'water', 'underwater', 'dissolved', 'catch', 'breathe', 'home', 'younger', 'floor'];
    const questionLower = interpretation.selfReflection.toLowerCase();
    const referencedElements = dreamElements.filter(element => questionLower.includes(element));
    
    if (referencedElements.length > 0) {
      console.log(`✅ References dream elements: ${referencedElements.join(', ')}`);
    } else {
      console.log('❌ No specific dream elements referenced');
    }
  } else {
    console.log('❌ Failed:', result.error);
  }
}

async function testAll() {
  console.log('🧪 Testing Dream-Specific Self-Reflection Questions\n');
  console.log('Dream:', testDream.text);
  
  const interpreters: InterpreterType[] = ['jung', 'lakshmi', 'freud', 'mary'];
  
  for (const type of interpreters) {
    await testInterpreter(type);
  }
  
  console.log('\n✅ Test complete!');
  process.exit(0);
}

testAll().catch(console.error);