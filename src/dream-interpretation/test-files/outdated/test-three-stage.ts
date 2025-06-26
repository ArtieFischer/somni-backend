/**
 * Test Three-Stage Interpreter
 * Tests the 3-stage approach: relevance assessment, full interpretation, JSON formatting
 */

import { threeStageInterpreter } from '../services/three-stage-interpreter';
import * as fs from 'fs';
import * as path from 'path';

const testDream = {
  id: 'three-stage-test-001',
  text: `I was in my childhood home, but the walls were made of glass. I could see through them to an endless ocean. My mother was there, but she looked younger, like in old photographs. She was trying to tell me something important, but when she spoke, only bubbles came out of her mouth. I felt anxious because I couldn't understand her. Suddenly, the floor became water too, and I was floating between the house and the ocean.`,
  themes: [
    { code: 'home', name: 'Home', relevanceScore: 0.9 },
    { code: 'wall', name: 'Wall', relevanceScore: 0.8 },
    { code: 'glass', name: 'Glass', relevanceScore: 0.8 },
    { code: 'ocean', name: 'Ocean', relevanceScore: 0.9 },
    { code: 'mother', name: 'Mother', relevanceScore: 0.95 },
    { code: 'water', name: 'Water', relevanceScore: 0.85 },
    { code: 'floating', name: 'Floating', relevanceScore: 0.7 },
    { code: 'communication', name: 'Communication', relevanceScore: 0.8 }
  ]
};

async function testThreeStageInterpretation() {
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
  
  log('🚀 Testing Three-Stage Interpreter');
  log('==================================\n');
  
  log(`📝 Dream: "${testDream.text}"\n`);
  log(`🏷️  Themes: ${testDream.themes.map(t => t.name).join(', ')}\n`);
  log(`📊 Theme count: ${testDream.themes.length} themes\n`);
  
  log('🔄 Starting 3-stage interpretation process...\n');
  
  const stageStartTime = Date.now();
  
  try {
    // Run interpretation
    const result = await threeStageInterpreter.interpretDream({
      dreamId: testDream.id,
      userId: 'test-user-001',
      dreamTranscription: testDream.text,
      interpreterType: 'jung',
      themes: testDream.themes,
      userContext: {
        age: 35,
        currentLifeSituation: 'navigating family relationships and personal identity',
        emotionalState: 'seeking clarity and understanding'
      }
    });
    
    log('✅ Three-stage interpretation completed!\n');
    log(`⏱️  Total processing time: ${result.processingTime}ms\n`);
    
    log('═══════════════════════════════════════════════════════════════');
    log('📋 STAGE RESULTS');
    log('═══════════════════════════════════════════════════════════════\n');
    
    // Show metadata about the process
    if (result.generationMetadata) {
      log('📊 Process Metadata:');
      log(`   • Stages completed: ${result.generationMetadata.stagesCompleted?.join(' → ')}`);
      log(`   • Knowledge fragments used: ${result.generationMetadata.knowledgeFragmentsUsed}/${result.generationMetadata.totalFragmentsRetrieved}`);
      log(`   • Themes processed: ${result.generationMetadata.themesUsed?.length}\n`);
    }
    
    log('═══════════════════════════════════════════════════════════════');
    log('🎯 FINAL INTERPRETATION');
    log('═══════════════════════════════════════════════════════════════\n');
    
    log(`📌 Dream Topic: ${result.dreamTopic}`);
    log(`💭 Quick Take: ${result.quickTake}`);
    log(`🔣 Key Symbols: ${result.symbols.join(', ')}\n`);
    
    if (result.emotionalTone) {
      log(`😊 Emotional Tone: ${result.emotionalTone.primary} (intensity: ${result.emotionalTone.intensity})\n`);
    }
    
    log('📖 Condensed Interpretation:');
    log('─'.repeat(70));
    log(result.interpretation);
    log('─'.repeat(70));
    log('');
    
    if (result.interpretationCore) {
      log('🔍 Core Insights:');
      log(`   • Type: ${result.interpretationCore.type}`);
      log(`   • Primary Insight: ${result.interpretationCore.primaryInsight}`);
      log(`   • Key Pattern: ${result.interpretationCore.keyPattern}`);
      log(`   • Personal Guidance: ${result.interpretationCore.personalGuidance}\n`);
      
      if (result.interpretationCore.archetypalDynamics) {
        log('🎭 Archetypal Dynamics:');
        log(`   • Primary Archetype: ${result.interpretationCore.archetypalDynamics.primaryArchetype}`);
        log(`   • Shadow Elements: ${result.interpretationCore.archetypalDynamics.shadowElements}`);
        log(`   • Compensatory Function: ${result.interpretationCore.archetypalDynamics.compensatoryFunction}\n`);
      }
    }
    
    if (result.practicalGuidance && result.practicalGuidance.length > 0) {
      log('🧭 Practical Guidance:');
      result.practicalGuidance.forEach((guidance, i) => {
        log(`   ${i + 1}. ${guidance}`);
      });
      log('');
    }
    
    log(`❓ Self-Reflection: ${result.selfReflection}\n`);
    
    // Show full interpretation if available
    if (result.fullInterpretation) {
      log('\n═══════════════════════════════════════════════════════════════');
      log('📜 FULL COMPREHENSIVE INTERPRETATION');
      log('═══════════════════════════════════════════════════════════════\n');
      log(result.fullInterpretation);
      log('\n═══════════════════════════════════════════════════════════════\n');
    }
    
    log('✨ Interpretation process complete!\n');
    
  } catch (error) {
    log(`\n❌ Error during interpretation: ${error instanceof Error ? error.message : 'Unknown error'}`);
    if (error instanceof Error && error.stack) {
      log(`\nStack trace:\n${error.stack}`);
    }
  }
  
  // Save results
  const filename = `three-stage-test-${timestamp}.txt`;
  const filepath = path.join(outputDir, filename);
  
  fs.writeFileSync(filepath, outputLines.join('\n'), 'utf8');
  
  log(`\n📁 Results saved to: ${filepath}`);
}

// Run test
if (require.main === module) {
  testThreeStageInterpretation().catch(console.error);
}

export { testThreeStageInterpretation };