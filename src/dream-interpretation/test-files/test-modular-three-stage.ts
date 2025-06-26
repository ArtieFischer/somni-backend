/**
 * Test Modular Three-Stage Interpreter
 * This test replicates the original three-stage test but uses the modular system
 */

import { modularThreeStageInterpreter } from '../services/modular-three-stage-interpreter';
import * as fs from 'fs';
import * as path from 'path';

// Test dream from original three-stage test
const testDream = {
  id: 'test-dream-001',
  text: `I was in my childhood home, but the walls were made of glass. I could see through them to an endless ocean. My mother was there, but she looked younger, like in old photographs. She was trying to tell me something important, but when she spoke, only bubbles came out of her mouth. I felt anxious because I couldn't understand her. Suddenly, the floor became water too, and I was floating between the house and the ocean.`,
  themes: [
    { code: 'home', name: 'Home', relevanceScore: 0.9 },
    { code: 'wall', name: 'Wall', relevanceScore: 0.8 },
    { code: 'glass', name: 'Glass', relevanceScore: 0.85 },
    { code: 'ocean', name: 'Ocean', relevanceScore: 0.95 },
    { code: 'mother', name: 'Mother', relevanceScore: 0.9 },
    { code: 'water', name: 'Water', relevanceScore: 0.95 },
    { code: 'floating', name: 'Floating', relevanceScore: 0.8 },
    { code: 'communication', name: 'Communication', relevanceScore: 0.85 }
  ]
};

async function testModularThreeStage() {
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
  
  log('🚀 Testing Modular Three-Stage Interpreter');
  log('==========================================\n');
  
  log(`📝 Dream: "${testDream.text}"\n`);
  log(`🏷️  Themes: ${testDream.themes.map(t => t.name).join(', ')}`);
  log(`📊 Theme count: ${testDream.themes.length} themes\n`);
  
  log('🔄 Starting 3-stage interpretation process...\n');
  
  try {
    // Add stage logging
    const originalInfo = console.info;
    console.info = (...args: any[]) => {
      originalInfo(...args);
      // Capture stage transitions
      const message = args[0];
      if (typeof message === 'string') {
        if (message.includes('Stage 1:')) log('\n📋 Stage 1: Assessing relevance...');
        if (message.includes('Stage 2:')) log('📋 Stage 2: Generating full interpretation...');
        if (message.includes('Stage 3:')) log('📋 Stage 3: Formatting to JSON...');
        if (message.includes('Knowledge retrieval complete')) {
          const data = args[1];
          log(`   • Retrieved ${data?.fragmentCount || 0} knowledge fragments`);
        }
      }
    };

    // Test with Jung interpreter
    log('Testing JUNG interpretation:');
    log('─'.repeat(70));
    
    const jungResult = await modularThreeStageInterpreter.interpretDream({
      dreamId: testDream.id,
      userId: 'test-user',
      dreamTranscription: testDream.text,
      interpreterType: 'jung',
      themes: testDream.themes,
      userContext: {
        age: 35,
      }
    });
    
    log('\n✅ Three-stage interpretation completed!');
    log(`\n⏱️  Total processing time: ${jungResult.processingTime}ms\n`);
    
    // Display stage results
    log('═'.repeat(63));
    log('📋 STAGE RESULTS');
    log('═'.repeat(63));
    
    if (jungResult.generationMetadata) {
      log('\n📊 Process Metadata:');
      log(`   • Stages completed: ${jungResult.generationMetadata.stagesCompleted?.join(' → ')}`);
      log(`   • Knowledge fragments used: ${jungResult.generationMetadata.knowledgeFragmentsUsed}/${jungResult.generationMetadata.totalFragmentsRetrieved}`);
      log(`   • Themes processed: ${testDream.themes.length}`);
    }
    
    log('\n═'.repeat(63));
    log('🎯 FINAL INTERPRETATION');
    log('═'.repeat(63));
    
    log(`\n📌 Dream Topic: ${jungResult.dreamTopic}`);
    log(`💭 Quick Take: ${jungResult.quickTake}`);
    log(`🔣 Key Symbols: ${jungResult.symbols.join(', ')}`);
    
    if (jungResult.emotionalTone) {
      log(`\n😊 Emotional Tone: ${jungResult.emotionalTone.primary} (intensity: ${jungResult.emotionalTone.intensity})`);
    }
    
    log('\n📖 Condensed Interpretation:');
    log('─'.repeat(70));
    log(jungResult.interpretation);
    log('─'.repeat(70));
    
    // Show interpretation core
    if (jungResult.interpretationCore) {
      log('\n🔍 Core Insights:');
      log(`   • Type: ${jungResult.interpretationCore.type}`);
      log(`   • Primary Insight: ${jungResult.interpretationCore.primaryInsight}`);
      log(`   • Key Pattern: ${jungResult.interpretationCore.keyPattern}`);
      log(`   • Personal Guidance: ${jungResult.interpretationCore.personalGuidance}`);
      
      if (jungResult.interpretationCore.archetypalDynamics) {
        log('\n🎭 Archetypal Dynamics:');
        log(`   • Primary Archetype: ${jungResult.interpretationCore.archetypalDynamics.primaryArchetype}`);
        log(`   • Shadow Elements: ${jungResult.interpretationCore.archetypalDynamics.shadowElements}`);
        log(`   • Compensatory Function: ${jungResult.interpretationCore.archetypalDynamics.compensatoryFunction}`);
      }
    }
    
    if (jungResult.practicalGuidance && jungResult.practicalGuidance.length > 0) {
      log('\n🧭 Practical Guidance:');
      jungResult.practicalGuidance.forEach((g, i) => {
        log(`   ${i + 1}. ${g}`);
      });
    }
    
    log(`\n❓ Self-Reflection: ${jungResult.selfReflection}`);
    
    // Show full interpretation if available
    if (jungResult.fullInterpretation) {
      log('\n\n═'.repeat(40));
      log('📜 FULL COMPREHENSIVE INTERPRETATION');
      log('═'.repeat(40));
      log(jungResult.fullInterpretation);
      log('═'.repeat(40));
    }
    
    // Show authenticity markers
    if (jungResult.authenticityMarkers) {
      log('\n\n📊 Authenticity Markers:');
      log(`   • Personal Engagement: ${jungResult.authenticityMarkers.personalEngagement}`);
      log(`   • Vocabulary Authenticity: ${jungResult.authenticityMarkers.vocabularyAuthenticity}`);
      log(`   • Conceptual Depth: ${jungResult.authenticityMarkers.conceptualDepth}`);
      log(`   • Therapeutic Value: ${jungResult.authenticityMarkers.therapeuticValue}`);
    }
    
    // Test with Lakshmi interpreter
    log('\n\n');
    log('Testing LAKSHMI interpretation:');
    log('─'.repeat(70));
    
    const lakshmiResult = await modularThreeStageInterpreter.interpretDream({
      dreamId: testDream.id + '-lakshmi',
      userId: 'test-user',
      dreamTranscription: testDream.text,
      interpreterType: 'lakshmi',
      themes: testDream.themes,
      userContext: {
        age: 35,
      }
    });
    
    log('\n✅ Three-stage interpretation completed!');
    log(`\n⏱️  Total processing time: ${lakshmiResult.processingTime}ms\n`);
    
    // Display Lakshmi stage results
    log('═'.repeat(63));
    log('📋 STAGE RESULTS (LAKSHMI)');
    log('═'.repeat(63));
    
    if (lakshmiResult.generationMetadata) {
      log('\n📊 Process Metadata:');
      log(`   • Stages completed: ${lakshmiResult.generationMetadata.stagesCompleted?.join(' → ')}`);
      log(`   • Knowledge fragments used: ${lakshmiResult.generationMetadata.knowledgeFragmentsUsed}/${lakshmiResult.generationMetadata.totalFragmentsRetrieved}`);
      log(`   • Themes processed: ${testDream.themes.length}`);
    }
    
    log('\n═'.repeat(63));
    log('🎯 FINAL INTERPRETATION (LAKSHMI)');
    log('═'.repeat(63));
    
    log(`\n📌 Dream Topic: ${lakshmiResult.dreamTopic}`);
    log(`💭 Quick Take: ${lakshmiResult.quickTake}`);
    log(`🔣 Key Symbols: ${lakshmiResult.symbols.join(', ')}`);
    
    if (lakshmiResult.emotionalTone) {
      log(`\n😊 Emotional Tone: ${lakshmiResult.emotionalTone.primary} (intensity: ${lakshmiResult.emotionalTone.intensity})`);
    }
    
    log('\n📖 Condensed Interpretation:');
    log('─'.repeat(70));
    log(lakshmiResult.interpretation);
    log('─'.repeat(70));
    
    // Show Lakshmi interpretation core
    if (lakshmiResult.interpretationCore) {
      log('\n🔍 Core Insights:');
      log(`   • Type: ${lakshmiResult.interpretationCore.type}`);
      log(`   • Primary Insight: ${lakshmiResult.interpretationCore.primaryInsight}`);
      log(`   • Key Pattern: ${lakshmiResult.interpretationCore.keyPattern}`);
      log(`   • Personal Guidance: ${lakshmiResult.interpretationCore.personalGuidance}`);
      
      if (lakshmiResult.interpretationCore.spiritualDynamics) {
        log('\n🕉️ Spiritual Dynamics:');
        log(`   • Karmic Pattern: ${lakshmiResult.interpretationCore.spiritualDynamics.karmicPattern}`);
        log(`   • Dharmic Guidance: ${lakshmiResult.interpretationCore.spiritualDynamics.dharmicGuidance}`);
        log(`   • Soul Lesson: ${lakshmiResult.interpretationCore.spiritualDynamics.soulLesson}`);
        log(`   • Divine Guidance: ${lakshmiResult.interpretationCore.spiritualDynamics.divineGuidance}`);
      }
      
      if (lakshmiResult.interpretationCore.chakraInfluences) {
        log('\n💎 Chakra Influences:');
        lakshmiResult.interpretationCore.chakraInfluences.forEach(c => {
          log(`   • ${c.chakra}: ${c.influence}`);
        });
      }
    }
    
    if (lakshmiResult.practicalGuidance && lakshmiResult.practicalGuidance.length > 0) {
      log('\n🧭 Practical Guidance:');
      lakshmiResult.practicalGuidance.forEach((g, i) => {
        log(`   ${i + 1}. ${g}`);
      });
    }
    
    log(`\n❓ Self-Reflection: ${lakshmiResult.selfReflection}`);
    
    // Show full interpretation if available
    if (lakshmiResult.fullInterpretation) {
      log('\n\n═'.repeat(40));
      log('📜 FULL COMPREHENSIVE INTERPRETATION (LAKSHMI)');
      log('═'.repeat(40));
      log(lakshmiResult.fullInterpretation);
      log('═'.repeat(40));
    }
    
    // Show authenticity markers
    if (lakshmiResult.authenticityMarkers) {
      log('\n\n📊 Authenticity Markers:');
      log(`   • Personal Engagement: ${lakshmiResult.authenticityMarkers.personalEngagement}`);
      log(`   • Vocabulary Authenticity: ${lakshmiResult.authenticityMarkers.vocabularyAuthenticity}`);
      log(`   • Conceptual Depth: ${lakshmiResult.authenticityMarkers.conceptualDepth}`);
      log(`   • Therapeutic Value: ${lakshmiResult.authenticityMarkers.therapeuticValue}`);
    }
    
    // Restore console.info
    console.info = originalInfo;
    
  } catch (error) {
    log(`\n❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    if (error instanceof Error) {
      log(`Stack: ${error.stack}`);
    }
  }
  
  log('\n\n✨ Interpretation process complete!');
  
  // Save results
  const filename = `modular-three-stage-test-${timestamp}.txt`;
  const filepath = path.join(outputDir, filename);
  
  fs.writeFileSync(filepath, outputLines.join('\n'), 'utf8');
  
  log(`\n📁 Results saved to: ${filepath}`);
}

// Run test
if (require.main === module) {
  testModularThreeStage().catch(console.error);
}

export { testModularThreeStage };