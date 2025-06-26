/**
 * Test single interpreter
 */

import { modularThreeStageInterpreter } from '../services/modular-three-stage-interpreter';
import { InterpreterType } from '../types';

const testDream = {
  id: 'test-dream-single',
  text: `I was in my childhood home, but it looked different - the walls were glass. My mother was there, trying to tell me something important.`,
  themes: ['family', 'communication', 'transformation']
};

async function testSingle(interpreterType: InterpreterType) {
  console.log(`Testing ${interpreterType}...`);
  
  try {
    const result = await modularThreeStageInterpreter.interpretDream({
      dreamId: testDream.id,
      userId: 'test-user',
      dreamTranscription: testDream.text,
      interpreterType,
      themes: testDream.themes.map(t => ({ code: t, name: t, relevanceScore: 0.8 })),
      userContext: { age: 35 }
    });
    
    if (result.success && result.data) {
      console.log('✅ Success!');
      console.log('Topic:', result.data.dreamTopic);
      console.log('Quick Take:', result.data.quickTake);
      const paragraphs = result.data.interpretation.split('\n\n');
      console.log('Paragraph count:', paragraphs.length);
      console.log('First paragraph length:', paragraphs[0]?.length || 0);
    } else {
      console.log('❌ Failed:', result.error);
    }
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

// Get interpreter from command line or default to jung
const interpreter = (process.argv[2] as InterpreterType) || 'jung';
testSingle(interpreter).catch(console.error);