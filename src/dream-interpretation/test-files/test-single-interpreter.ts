/**
 * Test a single interpreter to see the enhanced output
 */

import { modularThreeStageInterpreter } from '../services/modular-three-stage-interpreter';
import { InterpreterType } from '../types';

const testDream = {
  id: 'test-dream-001',
  text: `I was in my childhood home, but it looked different - the walls were glass and I could see the ocean outside. My mother was there, but she was younger, maybe in her 30s. She was trying to tell me something important, but her words came out as colorful bubbles that floated away before I could read them.`,
  // Using actual themes from the database
  themes: ['home', 'ocean', 'mother', 'glass', 'water']
};

async function testSingleInterpreter() {
  console.log('🧪 Testing Single Interpreter with Enhanced Output\n');
  console.log('📖 Dream Text:', testDream.text);
  console.log('\n🏷️ Themes Provided:', testDream.themes.map((theme, i) => 
    `${theme} (relevance: ${(0.8 - (i * 0.1)).toFixed(1)})`
  ).join(', '));
  console.log('\n' + '='.repeat(80) + '\n');

  // Get interpreter from command line argument
  const interpreterArg = process.argv[2]?.toLowerCase();
  const validInterpreters = ['jung', 'lakshmi', 'freud', 'mary'];
  const interpreterType: InterpreterType = validInterpreters.includes(interpreterArg) 
    ? interpreterArg as InterpreterType
    : 'lakshmi' as InterpreterType;
  
  console.log(`\n🔮 Testing ${interpreterType.toUpperCase()} Interpreter`);
  console.log('='.repeat(60));
  
  try {
    const startTime = Date.now();
    
    const result = await modularThreeStageInterpreter.interpretDream({
      dreamId: `${testDream.id}-${interpreterType}`,
      userId: 'test-user',
      dreamTranscription: testDream.text,
      interpreterType,
      themes: testDream.themes.map((theme, index) => ({
        code: theme,
        name: theme.charAt(0).toUpperCase() + theme.slice(1),
        relevanceScore: 0.8 - (index * 0.1)
      })),
      userContext: {
        age: 35,
        lifeStage: 'adult',
        currentLifeSituation: 'Career transition and family responsibilities',
        emotionalState: 'Contemplative, seeking clarity'
      }
    });
    
    const endTime = Date.now();
    
    if (result.success && result.data) {
      const interpretation = result.data;
      
      console.log('\n📊 INTERPRETATION RESULTS:');
      console.log('Topic:', interpretation.dreamTopic);
      console.log('Quick Take:', interpretation.quickTake);
      
      // Display knowledge retrieval statistics
      if (interpretation.generationMetadata) {
        console.log('\n📚 Knowledge Retrieval Statistics:');
        console.log(`  - Total fragments retrieved from database: ${interpretation.generationMetadata.totalFragmentsRetrieved || 'N/A'}`);
        console.log(`  - Fragments used after quality control: ${interpretation.generationMetadata.knowledgeFragmentsUsed || 'N/A'}`);
        console.log(`  - Quality ratio: ${
          interpretation.generationMetadata.totalFragmentsRetrieved && interpretation.generationMetadata.knowledgeFragmentsUsed
            ? ((interpretation.generationMetadata.knowledgeFragmentsUsed / interpretation.generationMetadata.totalFragmentsRetrieved) * 100).toFixed(1) + '%'
            : 'N/A'
        }`);
      }
      
      console.log('\n🔍 Symbols:', interpretation.symbols.join(', '));
      console.log('\n💭 Condensed Interpretation:');
      console.log(interpretation.interpretation);
      
      console.log('\n🎯 Practical Guidance:');
      if (interpretation.practicalGuidance) {
        interpretation.practicalGuidance.forEach((guidance, i) => {
          console.log(`${i + 1}. ${guidance}`);
        });
      }
      
      console.log('\n❓ Self-Reflection Question:');
      console.log(interpretation.selfReflection);
      
      console.log('\n⏱️ Processing Time:', `${endTime - startTime}ms`);
      console.log('📝 Full Interpretation Length:', interpretation.fullInterpretation?.length || 0, 'characters');
      console.log('📝 Condensed Length:', interpretation.interpretation.length, 'characters');
      
    } else {
      console.error('❌ Interpretation failed:', result.error);
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('\n✅ Test completed!');
}

// Run the test
testSingleInterpreter().catch(console.error);