/**
 * Test Mundane Dream with Mismatched Themes
 * Testing edge case: boring dream with themes that don't obviously fit
 */

import { threeStageInterpreter } from '../services/three-stage-interpreter';
import * as fs from 'fs';
import * as path from 'path';

const mundaneDream = {
  id: 'mundane-test-001',
  text: `I was at my office doing my usual tasks. I sat at my desk typing emails and attending meetings. My boss came by to discuss a project deadline. Everything was very mundane and ordinary, just like a typical workday. I remember feeling slightly bored and checking the clock frequently, waiting for 5 PM to arrive.`,
  themes: [
    { code: 'chase', name: 'Chase', relevanceScore: 0.7 },
    { code: 'office', name: 'Office', relevanceScore: 0.95 },
    { code: 'clock', name: 'Clock', relevanceScore: 0.9 }
  ]
};

async function testMundaneDream() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
  const outputDir = path.join(__dirname, 'test-results');
  
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  const outputLines: string[] = [];
  const log = (text: string) => {
    console.log(text);
    outputLines.push(text);
  };
  
  log('🌙 Testing Mundane Dream with Three-Stage Interpreter');
  log('====================================================\n');
  
  log(`📝 Dream: "${mundaneDream.text}"\n`);
  log(`🏷️  Themes: ${mundaneDream.themes.map(t => t.name).join(', ')}`);
  log('❓ Note: "Chase" theme doesn\'t appear in dream content - testing relevance assessment\n');
  
  log('🔄 Starting 3-stage interpretation process...\n');
  
  // Test with Jung
  try {
    log('📖 JUNG INTERPRETATION');
    log('─'.repeat(70));
    
    const jungResult = await threeStageInterpreter.interpretDream({
      dreamId: mundaneDream.id,
      userId: 'test-user-mundane',
      dreamTranscription: mundaneDream.text,
      interpreterType: 'jung',
      themes: mundaneDream.themes,
      userContext: {
        age: 35,
        currentLifeSituation: 'feeling stuck in routine, questioning life direction',
        emotionalState: 'restless and searching for meaning'
      }
    });
    
    log('\n✅ Jung interpretation complete!\n');
    
    // Show relevance assessment insights
    if (jungResult.generationMetadata) {
      log('📊 Process Insights:');
      log(`   • Knowledge fragments used: ${jungResult.generationMetadata.knowledgeFragmentsUsed}/${jungResult.generationMetadata.totalFragmentsRetrieved}`);
      log(`   • Processing time: ${jungResult.processingTime}ms\n`);
    }
    
    log(`📌 Dream Topic: ${jungResult.dreamTopic}`);
    log(`\n💭 Quick Take:\n${jungResult.quickTake}`);
    log(`\n🔣 Key Symbols: ${jungResult.symbols.join(', ')}`);
    
    if (jungResult.emotionalTone) {
      log(`\n😊 Emotional Tone: ${jungResult.emotionalTone.primary} (intensity: ${jungResult.emotionalTone.intensity})`);
    }
    
    log('\n📖 Condensed Interpretation:');
    log('─'.repeat(70));
    log(jungResult.interpretation);
    log('─'.repeat(70));
    
    if (jungResult.interpretationCore?.archetypalDynamics) {
      log('\n🎭 Archetypal Dynamics:');
      log(`   • Primary Archetype: ${jungResult.interpretationCore.archetypalDynamics.primaryArchetype}`);
      log(`   • Shadow Elements: ${jungResult.interpretationCore.archetypalDynamics.shadowElements}`);
      log(`   • Compensatory Function: ${jungResult.interpretationCore.archetypalDynamics.compensatoryFunction}`);
    }
    
    if (jungResult.practicalGuidance) {
      log('\n🧭 Practical Guidance:');
      jungResult.practicalGuidance.forEach((g, i) => {
        log(`   ${i + 1}. ${g}`);
      });
    }
    
    log(`\n❓ Self-Reflection: ${jungResult.selfReflection}`);
    
    // Show full interpretation if available
    if (jungResult.fullInterpretation) {
      log('\n\n📜 FULL COMPREHENSIVE INTERPRETATION');
      log('═'.repeat(70));
      log(jungResult.fullInterpretation);
      log('═'.repeat(70));
    }
    
  } catch (error) {
    log(`\n❌ Jung interpretation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
  
  // Test with Lakshmi
  log('\n\n🕉️  LAKSHMI INTERPRETATION');
  log('─'.repeat(70));
  
  try {
    const lakshmiResult = await threeStageInterpreter.interpretDream({
      dreamId: mundaneDream.id + '-lakshmi',
      userId: 'test-user-mundane',
      dreamTranscription: mundaneDream.text,
      interpreterType: 'lakshmi',
      themes: mundaneDream.themes,
      userContext: {
        age: 35,
        currentLifeSituation: 'feeling disconnected from spiritual purpose',
        emotionalState: 'seeking deeper meaning'
      }
    });
    
    log('\n✅ Lakshmi interpretation complete!\n');
    
    log(`📌 Dream Topic: ${lakshmiResult.dreamTopic}`);
    log(`\n💭 Quick Take:\n${lakshmiResult.quickTake}`);
    
    log('\n🌟 Spiritual Interpretation:');
    log('─'.repeat(70));
    log(lakshmiResult.interpretation);
    log('─'.repeat(70));
    
    if (lakshmiResult.interpretationCore?.spiritualDynamics) {
      log('\n🌟 Spiritual Dynamics:');
      log(`   • Karmic Pattern: ${lakshmiResult.interpretationCore.spiritualDynamics.karmicPattern}`);
      log(`   • Soul Lesson: ${lakshmiResult.interpretationCore.spiritualDynamics.soulLesson}`);
      log(`   • Divine Guidance: ${lakshmiResult.interpretationCore.spiritualDynamics.divineGuidance}`);
    }
    
    log(`\n❓ Sacred Question: ${lakshmiResult.selfReflection}`);
    
  } catch (error) {
    log(`\n❌ Lakshmi interpretation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
  
  // Save results
  const filename = `mundane-dream-test-${timestamp}.txt`;
  const filepath = path.join(outputDir, filename);
  
  fs.writeFileSync(filepath, outputLines.join('\n'), 'utf8');
  
  log(`\n\n📁 Results saved to: ${filepath}`);
}

// Run test
if (require.main === module) {
  testMundaneDream().catch(console.error);
}

export { testMundaneDream };