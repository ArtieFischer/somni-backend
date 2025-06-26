/**
 * Interactive Three-Stage Interpreter Test
 * Allows testing with custom dreams and themes
 */

import { threeStageInterpreter } from '../services/three-stage-interpreter';
import * as fs from 'fs';
import * as path from 'path';

// Test dreams you can modify
const testDreams = [
  {
    id: 'test-001',
    text: `I was walking through a dark forest when I came upon a clearing. In the center was a massive tree with golden leaves. As I approached, the tree began to speak, but its words were in a language I couldn't understand. A white owl landed on my shoulder and whispered "You already know the answer." I woke up feeling both confused and enlightened.`,
    themes: [
      { code: 'forest', name: 'Forest', relevanceScore: 0.9 },
      { code: 'tree', name: 'Tree', relevanceScore: 0.95 },
      { code: 'gold', name: 'Gold', relevanceScore: 0.8 },
      { code: 'owl', name: 'Owl', relevanceScore: 0.9 },
      { code: 'wisdom', name: 'Wisdom', relevanceScore: 0.85 },
      { code: 'communication', name: 'Communication', relevanceScore: 0.8 }
    ],
    interpreterType: 'jung' as const
  },
  {
    id: 'test-002',
    text: `I found myself in a temple made of crystal. The walls were singing a beautiful melody that made my heart expand. A goddess figure appeared, her face shifting between my mother, grandmother, and a stranger. She handed me a lotus flower that turned into light in my hands. I felt an overwhelming sense of love and belonging.`,
    themes: [
      { code: 'temple', name: 'Temple', relevanceScore: 0.95 },
      { code: 'crystal', name: 'Crystal', relevanceScore: 0.8 },
      { code: 'goddess', name: 'Goddess', relevanceScore: 0.95 },
      { code: 'mother', name: 'Mother', relevanceScore: 0.9 },
      { code: 'lotus', name: 'Lotus', relevanceScore: 0.9 },
      { code: 'light', name: 'Light', relevanceScore: 0.85 },
      { code: 'love', name: 'Love', relevanceScore: 0.9 }
    ],
    interpreterType: 'lakshmi' as const
  }
];

async function runInteractiveTest() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
  const outputDir = path.join(__dirname, 'test-results');
  
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  console.log('🌙 Three-Stage Dream Interpreter Test');
  console.log('=====================================\n');
  
  // Select which dream to test (modify this index to test different dreams)
  const dreamIndex = 0; // Change to 1 for second dream
  const testDream = testDreams[dreamIndex];
  
  console.log(`📝 Testing Dream ${dreamIndex + 1}:`);
  console.log(`"${testDream.text.substring(0, 100)}..."\n`);
  console.log(`🏷️  Themes: ${testDream.themes.map(t => t.name).join(', ')}`);
  console.log(`🧠 Interpreter: ${testDream.interpreterType.toUpperCase()}\n`);
  
  console.log('🔄 Starting interpretation...\n');
  
  try {
    const result = await threeStageInterpreter.interpretDream({
      dreamId: testDream.id,
      userId: 'test-user',
      dreamTranscription: testDream.text,
      interpreterType: testDream.interpreterType,
      themes: testDream.themes,
      userContext: {
        age: 35,
        currentLifeSituation: 'exploring personal growth and seeking deeper meaning',
        emotionalState: 'open and curious'
      }
    });
    
    console.log('✅ Interpretation complete!\n');
    console.log('═'.repeat(70));
    console.log('INTERPRETATION RESULTS');
    console.log('═'.repeat(70));
    
    console.log(`\n📌 Dream Topic: ${result.dreamTopic}`);
    console.log(`\n💭 Quick Take:\n${result.quickTake}`);
    console.log(`\n🔣 Key Symbols: ${result.symbols.join(', ')}`);
    
    if (result.emotionalTone) {
      console.log(`\n😊 Emotional Tone: ${result.emotionalTone.primary} (intensity: ${result.emotionalTone.intensity})`);
    }
    
    console.log('\n📖 Main Interpretation:');
    console.log('─'.repeat(70));
    console.log(result.interpretation);
    console.log('─'.repeat(70));
    
    if (result.interpretationCore) {
      console.log('\n🔍 Core Insights:');
      console.log(`• Primary Insight: ${result.interpretationCore.primaryInsight}`);
      console.log(`• Key Pattern: ${result.interpretationCore.keyPattern}`);
      console.log(`• Personal Guidance: ${result.interpretationCore.personalGuidance}`);
      
      if (result.interpretationCore.archetypalDynamics) {
        console.log('\n🎭 Archetypal Dynamics:');
        console.log(`• Primary Archetype: ${result.interpretationCore.archetypalDynamics.primaryArchetype}`);
        console.log(`• Shadow Elements: ${result.interpretationCore.archetypalDynamics.shadowElements}`);
        console.log(`• Compensatory Function: ${result.interpretationCore.archetypalDynamics.compensatoryFunction}`);
      }
      
      if (result.interpretationCore.spiritualDynamics) {
        console.log('\n🌟 Spiritual Dynamics:');
        console.log(`• Karmic Pattern: ${result.interpretationCore.spiritualDynamics.karmicPattern}`);
        console.log(`• Soul Lesson: ${result.interpretationCore.spiritualDynamics.soulLesson}`);
        console.log(`• Divine Guidance: ${result.interpretationCore.spiritualDynamics.divineGuidance}`);
      }
    }
    
    if (result.practicalGuidance && result.practicalGuidance.length > 0) {
      console.log('\n🧭 Practical Guidance:');
      result.practicalGuidance.forEach((guidance, i) => {
        console.log(`${i + 1}. ${guidance}`);
      });
    }
    
    console.log(`\n❓ Self-Reflection:\n${result.selfReflection}`);
    
    console.log(`\n⏱️  Processing time: ${result.processingTime}ms`);
    
    // Save full results
    const filename = `three-stage-interactive-${testDream.interpreterType}-${timestamp}.json`;
    const filepath = path.join(outputDir, filename);
    
    fs.writeFileSync(filepath, JSON.stringify({
      dreamText: testDream.text,
      themes: testDream.themes,
      interpretation: result
    }, null, 2), 'utf8');
    
    console.log(`\n📁 Full results saved to: ${filepath}`);
    
    // Also save just the full interpretation text if available
    if (result.fullInterpretation) {
      const textFilename = `three-stage-full-interpretation-${timestamp}.txt`;
      const textFilepath = path.join(outputDir, textFilename);
      fs.writeFileSync(textFilepath, result.fullInterpretation, 'utf8');
      console.log(`📄 Full interpretation text saved to: ${textFilepath}`);
    }
    
  } catch (error) {
    console.error('\n❌ Error:', error instanceof Error ? error.message : 'Unknown error');
  }
}

// Add your own custom dream test
async function testCustomDream() {
  // MODIFY THIS SECTION WITH YOUR OWN DREAM
  const customDream = {
    text: `[PUT YOUR DREAM TEXT HERE]`,
    themes: [
      { code: 'theme1', name: 'Theme1', relevanceScore: 0.9 },
      { code: 'theme2', name: 'Theme2', relevanceScore: 0.8 },
      // Add more themes as needed
    ],
    interpreterType: 'jung' as const // or 'lakshmi'
  };
  
  console.log('🌙 Testing Custom Dream');
  console.log('======================\n');
  
  try {
    const result = await threeStageInterpreter.interpretDream({
      dreamId: 'custom-dream-001',
      userId: 'test-user',
      dreamTranscription: customDream.text,
      interpreterType: customDream.interpreterType,
      themes: customDream.themes,
      userContext: {
        age: 30,
        currentLifeSituation: 'your situation here',
        emotionalState: 'your emotional state'
      }
    });
    
    console.log('✅ Custom dream interpretation complete!');
    console.log('\n' + '═'.repeat(70));
    console.log(result.interpretation);
    console.log('═'.repeat(70));
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

// Run the test
if (require.main === module) {
  // Uncomment the test you want to run:
  
  runInteractiveTest().catch(console.error);  // Run predefined test dreams
  
  // testCustomDream().catch(console.error);   // Run your custom dream
}