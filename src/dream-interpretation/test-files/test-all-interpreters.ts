/**
 * Test all four interpreters in the modular three-stage system
 */

import { modularThreeStageInterpreter } from '../services/modular-three-stage-interpreter';
import { InterpreterType } from '../types';

const testDream = {
  id: 'test-dream-001',
  text: `I was in my childhood home, but it looked different - the walls were glass and I could see the ocean outside. My mother was there, but she was younger, maybe in her 30s. She was trying to tell me something important, but her words came out as colorful bubbles that floated away before I could read them. 
  
  I felt frustrated and tried to catch the bubbles, but they kept dissolving. Then I noticed the floor was turning into water. Instead of panicking, I found I could breathe underwater. Swimming through what used to be our living room, I discovered a hidden door I'd never seen before. Behind it was a library filled with glowing books.
  
  Each book contained a memory I had forgotten. When I touched one, I was suddenly outside watching my younger self playing in the garden. The scene felt more real than my current life. I wanted to stay, but then I heard an alarm and everything started fading.`,
  // Using actual themes from the database
  themes: ['home', 'ocean', 'mother', 'water', 'door', 'library', 'book', 'garden']
};

async function testAllInterpreters() {
  console.log('🧪 Testing All Four Interpreters with Modular Three-Stage System\n');
  console.log('📖 Dream Text:', testDream.text);
  console.log('\n🏷️ Themes Provided:', testDream.themes.map((theme, i) => 
    `${theme} (relevance: ${(0.8 - (i * 0.1)).toFixed(1)})`
  ).join(', '));
  console.log('\n' + '='.repeat(80) + '\n');

  const interpreters: InterpreterType[] = ['jung', 'lakshmi', 'freud', 'mary'];
  
  for (const interpreterType of interpreters) {
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
          console.log('\n📚 Knowledge Retrieval:');
          console.log(`  - Total fragments retrieved: ${interpretation.generationMetadata.totalFragmentsRetrieved || 'N/A'}`);
          console.log(`  - Fragments used after quality control: ${interpretation.generationMetadata.knowledgeFragmentsUsed || 'N/A'}`);
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
        
        // Display interpreter-specific insights
        console.log('\n✨ Interpreter-Specific Insights:');
        const core = interpretation.interpretationCore;
        if (core) {
          switch (interpreterType) {
            case 'jung':
              if ('archetypalDynamics' in core && core.archetypalDynamics) {
                console.log('Primary Archetype:', core.archetypalDynamics.primaryArchetype);
                console.log('Compensatory Function:', core.archetypalDynamics.compensatoryFunction);
              }
              break;
            case 'lakshmi':
              if ('spiritualDynamics' in core && core.spiritualDynamics) {
                console.log('Karmic Pattern:', core.spiritualDynamics.karmicPattern);
                console.log('Soul Lesson:', core.spiritualDynamics.soulLesson);
              }
              break;
            case 'freud':
              if ('psychoanalyticElements' in core && core.psychoanalyticElements) {
                console.log('Primary Drive:', core.psychoanalyticElements.primaryDrive);
                console.log('Defense Mechanisms:', core.psychoanalyticElements.defensesMechanisms?.join(', '));
              }
              break;
            case 'mary':
              if ('neuroscientificElements' in core && core.neuroscientificElements) {
                console.log('Sleep Stage:', core.neuroscientificElements.sleepStage?.stage);
                console.log('Cognitive Processes:', core.neuroscientificElements.cognitiveProcesses?.join(', '));
              }
              break;
          }
        }
        
        console.log('\n⏱️ Processing Time:', `${endTime - startTime}ms`);
        console.log('📝 Full Interpretation Length:', interpretation.fullInterpretation?.length || 0, 'characters');
        console.log('📝 Condensed Length:', interpretation.interpretation.length, 'characters');
        
        // Count domain-specific terms
        const domainTerms = {
          jung: ['archetype', 'shadow', 'anima', 'animus', 'Self', 'individuation', 'collective unconscious', 'persona', 'complex'],
          lakshmi: ['karma', 'dharma', 'chakra', 'maya', 'samsara', 'moksha', 'atman', 'prana'],
          freud: ['unconscious', 'repression', 'id', 'ego', 'superego', 'libido', 'transference', 'complex', 'defense mechanism', 'wish-fulfillment'],
          mary: ['hippocampus', 'amygdala', 'prefrontal cortex', 'REM sleep', 'consolidation', 'neural plasticity', 'neurotransmitter', 'activation-synthesis']
        };
        
        const terms = domainTerms[interpreterType];
        const usedTerms = terms.filter(term => 
          interpretation.interpretation.toLowerCase().includes(term.toLowerCase())
        );
        console.log('🏷️ Domain-specific terms used:', usedTerms.length, '-', usedTerms.join(', '));
        
      } else {
        console.error('❌ Interpretation failed:', result.error);
      }
      
    } catch (error) {
      console.error('❌ Error:', error);
    }
    
    console.log('\n' + '='.repeat(60));
  }
  
  console.log('\n✅ All interpreter tests completed!');
}

// Run the test
testAllInterpreters().catch(console.error);