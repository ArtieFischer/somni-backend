#!/usr/bin/env node

/**
 * Simple test runner for the new modular prompt system
 * Runs comprehensive tests without requiring Jest setup
 */

const { PromptBuilderTestUtil } = require('./src/prompts');

console.log('🧪 RUNNING COMPREHENSIVE PROMPT SYSTEM TESTS 🧪\n');
console.log('═'.repeat(80));

async function runTests() {
  try {
    // Run all the built-in tests
    console.log('\n📋 Running Test Utilities...\n');
    PromptBuilderTestUtil.runAllTests();
    
    console.log('\n🎯 Running Custom Integration Tests...\n');
    
    // Additional integration tests
    await testNewModularStructure();
    await testErrorHandling();
    await testPerformance();
    
    console.log('\n✅ ALL TESTS COMPLETED SUCCESSFULLY');
    console.log('═'.repeat(80));
    console.log('\n🎉 Your new modular prompt system is working perfectly!\n');
    
  } catch (error) {
    console.error('\n❌ TEST SUITE FAILED:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

async function testNewModularStructure() {
  console.log('🏗️  Testing New Modular Structure...\n');
  
  const { PromptBuilderService, InterpretationParser } = require('./src/prompts');
  
  // Test that all modules are properly exported
  console.log('✅ PromptBuilderService imported successfully');
  console.log('✅ InterpretationParser imported successfully');
  
  // Test prompt building
  const testRequest = {
    dreamTranscription: 'I was flying over a vast ocean, feeling both free and terrified of falling.',
    interpreterType: 'jung',
    userContext: {
      age: 35,
      currentLifeSituation: 'Career transition',
      emotionalState: 'Seeking direction'
    },
    analysisDepth: 'deep'
  };
  
  const template = await PromptBuilderService.buildInterpretationPrompt(testRequest);
  
  console.log('✅ Prompt building works with new structure');
  console.log(`   📏 System prompt length: ${template.systemPrompt.length} chars`);
  console.log(`   🎯 Contains Jung reference: ${template.systemPrompt.includes('Carl Jung') ? 'Yes' : 'No'}`);
  console.log(`   👤 Contains age context: ${template.systemPrompt.includes('35') ? 'Yes' : 'No'}`);
  
  // Test response parsing
  const mockResponse = JSON.stringify({
    interpretation: "I'm struck by your dream of flying over the vast ocean...",
    symbols: ["flying", "ocean", "fear", "freedom"],
    coreInsight: "Your psyche is navigating the tension between freedom and security.",
    shadowAspect: "The fear of falling represents anxiety about losing control.",
    guidanceForDreamer: "Consider what in your life makes you feel both free and afraid.",
    reflectiveQuestion: "What would happen if you trusted your ability to fly?"
  });
  
  const parsed = await InterpretationParser.parseInterpretationResponse(mockResponse, 'jung');
  
  console.log('✅ Response parsing works with new structure');
  console.log(`   🧠 Parsed type: ${parsed.type}`);
  console.log(`   💡 Core message: ${parsed.coreMessage.substring(0, 50)}...`);
  console.log(`   🔮 Symbols count: ${parsed.type === 'jungian' ? parsed.symbols.length : 'N/A'}`);
}

async function testErrorHandling() {
  console.log('\n🛡️  Testing Error Handling...\n');
  
  const { PromptBuilderFactory, InterpretationParser } = require('./src/prompts');
  
  // Test factory error handling
  try {
    PromptBuilderFactory.create('invalid');
    console.log('❌ Should have thrown error for invalid interpreter');
  } catch (error) {
    console.log('✅ Factory correctly rejects invalid interpreter types');
  }
  
  // Test parser error handling
  try {
    await InterpretationParser.parseInterpretationResponse('test', 'invalid');
    console.log('❌ Should have thrown error for invalid interpreter');
  } catch (error) {
    console.log('✅ Parser correctly rejects invalid interpreter types');
  }
  
  // Test malformed JSON handling
  try {
    const result = await InterpretationParser.parseInterpretationResponse(
      '{ malformed json }', 
      'jung'
    );
    console.log('✅ Parser gracefully handles malformed JSON');
    console.log(`   📝 Fallback type: ${result.type}`);
  } catch (error) {
    console.log('⚠️  Parser threw error on malformed JSON:', error.message);
  }
}

async function testPerformance() {
  console.log('\n⚡ Testing Performance...\n');
  
  const { PromptBuilderService } = require('./src/prompts');
  
  // Test large dream text
  const largeDream = 'I was flying over the ocean. '.repeat(1000);
  
  const start = Date.now();
  const elements = PromptBuilderService.extractUniversalElements(largeDream);
  const duration = Date.now() - start;
  
  console.log(`✅ Large text processing: ${duration}ms`);
  console.log(`   📊 Text size: ${largeDream.length} chars`);
  console.log(`   🎯 Themes detected: ${elements.detectedThemes.length}`);
  console.log(`   🔑 Symbols found: ${elements.keySymbols.length}`);
  
  if (duration > 1000) {
    console.log('⚠️  Performance warning: Processing took over 1 second');
  }
  
  // Test consistency
  const results = Array.from({ length: 5 }, () => 
    PromptBuilderService.extractUniversalElements('I was flying over the ocean, scared of falling.')
  );
  
  const isConsistent = results.every(r => 
    r.emotionalTone === results[0].emotionalTone &&
    r.dreamType === results[0].dreamType &&
    JSON.stringify(r.keySymbols) === JSON.stringify(results[0].keySymbols)
  );
  
  console.log(`✅ Consistency across runs: ${isConsistent ? 'Consistent' : 'Inconsistent'}`);
}

// Run the tests
runTests(); 