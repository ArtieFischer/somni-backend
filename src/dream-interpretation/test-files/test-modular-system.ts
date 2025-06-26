/**
 * Test the Modular Dream Interpretation System
 */

import { modularThreeStageInterpreter } from '../services/modular-three-stage-interpreter';
import { interpreterRegistry } from '../interpreters/registry';
import * as fs from 'fs';
import * as path from 'path';

const testDreams = [
  {
    id: 'modular-test-001',
    text: `I was walking through a dark forest when I came upon a clearing. In the center was a massive tree with golden leaves. As I approached, the tree began to speak, but its words were in a language I couldn't understand. A white owl landed on my shoulder and whispered "You already know the answer." I woke up feeling both confused and enlightened.`,
    themes: [
      { code: 'forest', name: 'Forest', relevanceScore: 0.9 },
      { code: 'tree', name: 'Tree', relevanceScore: 0.95 },
      { code: 'gold', name: 'Gold', relevanceScore: 0.8 },
      { code: 'owl', name: 'Owl', relevanceScore: 0.9 },
      { code: 'wisdom', name: 'Wisdom', relevanceScore: 0.85 }
    ],
    interpreterType: 'jung' as const
  },
  {
    id: 'modular-test-002',
    text: `I found myself in a temple made of crystal. The walls were singing a beautiful melody that made my heart expand. A goddess figure appeared, her face shifting between my mother, grandmother, and a stranger. She handed me a lotus flower that turned into light in my hands. I felt an overwhelming sense of love and belonging.`,
    themes: [
      { code: 'temple', name: 'Temple', relevanceScore: 0.95 },
      { code: 'crystal', name: 'Crystal', relevanceScore: 0.8 },
      { code: 'goddess', name: 'Goddess', relevanceScore: 0.95 },
      { code: 'mother', name: 'Mother', relevanceScore: 0.9 },
      { code: 'lotus', name: 'Lotus', relevanceScore: 0.9 }
    ],
    interpreterType: 'lakshmi' as const
  }
];

async function testModularSystem() {
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
  
  log('🚀 Testing Modular Dream Interpretation System');
  log('=============================================\n');
  
  // Show available interpreters
  log('📚 Available Interpreters:');
  const interpreters = modularThreeStageInterpreter.getAvailableInterpreters();
  interpreters.forEach(interp => {
    log(`   • ${interp.type}: ${interp.metadata.name}`);
    log(`     ${interp.metadata.description}`);
  });
  log('');
  
  // Test each dream
  for (const testDream of testDreams) {
    log(`\n${'═'.repeat(70)}`);
    log(`📝 Testing Dream: ${testDream.id}`);
    log(`${'═'.repeat(70)}\n`);
    
    log(`Dream: "${testDream.text.substring(0, 100)}..."\n`);
    log(`Themes: ${testDream.themes.map(t => t.name).join(', ')}`);
    log(`Interpreter: ${testDream.interpreterType.toUpperCase()}\n`);
    
    try {
      const startTime = Date.now();
      
      const result = await modularThreeStageInterpreter.interpretDream({
        dreamId: testDream.id,
        userId: 'test-user-modular',
        dreamTranscription: testDream.text,
        interpreterType: testDream.interpreterType,
        themes: testDream.themes,
        userContext: {
          age: 35,
          currentLifeSituation: 'exploring personal growth through modular system',
          emotionalState: 'curious and open'
        }
      });
      
      const endTime = Date.now();
      
      log('✅ Interpretation complete!\n');
      
      // Display results
      log(`📌 Dream Topic: ${result.dreamTopic}`);
      log(`\n💭 Quick Take:\n${result.quickTake}`);
      log(`\n🔣 Key Symbols: ${result.symbols.join(', ')}`);
      
      if (result.emotionalTone) {
        log(`\n😊 Emotional Tone: ${result.emotionalTone.primary} (intensity: ${result.emotionalTone.intensity})`);
      }
      
      log('\n📖 Condensed Interpretation:');
      log('─'.repeat(70));
      log(result.interpretation);
      log('─'.repeat(70));
      
      // Show interpreter-specific insights
      if (result.interpretationCore) {
        log(`\n🔍 ${result.interpreterType === 'jung' ? 'Jungian' : 'Spiritual'} Insights:`);
        
        if (result.interpretationCore.type === 'jungian' && result.interpretationCore.archetypalDynamics) {
          log(`   • Primary Archetype: ${result.interpretationCore.archetypalDynamics.primaryArchetype}`);
          log(`   • Shadow Elements: ${result.interpretationCore.archetypalDynamics.shadowElements}`);
          log(`   • Compensatory Function: ${result.interpretationCore.archetypalDynamics.compensatoryFunction}`);
        }
        
        if (result.interpretationCore.type === 'vedantic' && result.interpretationCore.spiritualDynamics) {
          log(`   • Karmic Pattern: ${result.interpretationCore.spiritualDynamics.karmicPattern}`);
          log(`   • Soul Lesson: ${result.interpretationCore.spiritualDynamics.soulLesson}`);
          log(`   • Divine Guidance: ${result.interpretationCore.spiritualDynamics.divineGuidance}`);
        }
      }
      
      if (result.practicalGuidance && result.practicalGuidance.length > 0) {
        log('\n🧭 Practical Guidance:');
        result.practicalGuidance.forEach((g, i) => {
          log(`   ${i + 1}. ${g}`);
        });
      }
      
      log(`\n❓ Self-Reflection: ${result.selfReflection}`);
      
      // Show metadata
      if (result.generationMetadata) {
        log('\n📊 Generation Metadata:');
        log(`   • Stages completed: ${result.generationMetadata.stagesCompleted?.join(' → ')}`);
        log(`   • Knowledge fragments: ${result.generationMetadata.knowledgeFragmentsUsed}/${result.generationMetadata.totalFragmentsRetrieved}`);
        log(`   • Processing time: ${endTime - startTime}ms`);
      }
      
    } catch (error) {
      log(`\n❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  // Test error handling
  log(`\n\n${'═'.repeat(70)}`);
  log('🧪 Testing Error Handling');
  log(`${'═'.repeat(70)}\n`);
  
  try {
    await modularThreeStageInterpreter.interpretDream({
      dreamId: 'error-test',
      userId: 'test-user',
      dreamTranscription: 'test dream',
      interpreterType: 'invalid-interpreter' as any,
      themes: []
    });
  } catch (error) {
    log(`✅ Correctly caught error: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
  
  // Save results
  const filename = `modular-system-test-${timestamp}.txt`;
  const filepath = path.join(outputDir, filename);
  
  fs.writeFileSync(filepath, outputLines.join('\n'), 'utf8');
  
  log(`\n\n📁 Results saved to: ${filepath}`);
}

// Run test
if (require.main === module) {
  testModularSystem().catch(console.error);
}

export { testModularSystem };