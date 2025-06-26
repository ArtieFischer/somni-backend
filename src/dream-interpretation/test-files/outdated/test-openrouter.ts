/**
 * Test OpenRouter Integration
 * Simple test to verify the OpenRouter LLM service and interpretation pipeline
 */

import { interpretationPipeline } from '../services/interpretation-pipeline';
import { openRouterService } from '../../services/openrouter';
import { dreamInterpretationConfig } from '../config';
import { logger } from '../../utils/logger';

// Mock dream data for testing - more detailed and structured
const mockDreamData = {
  dreamId: 'test-dream-001',
  userId: 'test-user-001',
  dreamTranscription: `I was flying over a vast ocean under a bright blue sky. The water below was crystal clear and deep blue, and I could see dolphins swimming gracefully beneath me. I felt completely free and weightless as I soared through the air.

Suddenly, the scene changed and I found myself standing in a beautiful garden filled with vibrant red roses, white lilies, and golden sunflowers. The garden was surrounded by tall green trees, and there was a peaceful fountain in the center making gentle water sounds.

My grandmother appeared beside me, smiling warmly. She looked younger than I remembered, wearing a flowing white dress. She reached into her pocket and handed me an ornate golden key that felt warm in my palm. "This will open what you've been searching for," she said with a knowing look in her eyes.

I felt overwhelming peace and happiness wash over me. The key seemed to glow with inner light, and I knew it was something very important, though I wasn't sure what it would unlock. I woke up feeling hopeful and energized.`,
  interpreterType: 'jung' as const,
  themes: [
    {
      code: 'flying',
      name: 'Flying',
      relevanceScore: 0.95,
      symbolInterpretations: ['Freedom', 'Spiritual elevation', 'Overcoming limitations']
    },
    {
      code: 'water',
      name: 'Water',
      relevanceScore: 0.9,
      symbolInterpretations: ['Unconscious mind', 'Emotions', 'Life force']
    },
    {
      code: 'ocean',
      name: 'Ocean',
      relevanceScore: 0.9,
      symbolInterpretations: ['Collective unconscious', 'Vast potential', 'Deep emotions']
    },
    {
      code: 'garden',
      name: 'Garden',
      relevanceScore: 0.85,
      symbolInterpretations: ['Paradise', 'Growth', 'Cultivation of self']
    },
    {
      code: 'grandmother',
      name: 'Grandmother',
      relevanceScore: 0.8,
      symbolInterpretations: ['Wise old woman archetype', 'Ancestral wisdom', 'Guidance']
    },
    {
      code: 'key',
      name: 'Key',
      relevanceScore: 0.9,
      symbolInterpretations: ['Solution', 'Access to hidden knowledge', 'Transformation']
    },
    {
      code: 'dolphin',
      name: 'Dolphin',
      relevanceScore: 0.7,
      symbolInterpretations: ['Intelligence', 'Playfulness', 'Spiritual guide']
    }
  ],
  userContext: {
    age: 32,
    currentLifeSituation: 'Starting a new career in tech after leaving corporate consulting',
    emotionalState: 'excited but anxious about the future, seeking direction and purpose',
    recentLifeEvents: 'Recently moved to a new city, ended a long-term relationship',
    personalChallenges: 'Struggling with self-doubt and finding authentic path'
  },
  options: {
    includeDebugInfo: true,
    skipValidation: true, // Skip validation for now to test pipeline
    maxRetries: 2
  }
};

async function testOpenRouterConnection() {
  console.log('\n🔌 Testing OpenRouter Connection...');
  
  try {
    const testResult = await openRouterService.testConnection();
    
    console.log('Connection Test Results:');
    console.log(`✅ Overall Success: ${testResult}`);
    
    const config = dreamInterpretationConfig.getLLMConfig();
    console.log(`📡 Primary Model: ${config.primaryModel}`);
    console.log(`🔄 Fallback Model: ${config.fallbackModel}`);
    if (config.fallbackModel2) {
      console.log(`🔄 Fallback Model 2: ${config.fallbackModel2}`);
    }
    
    return testResult;
  } catch (error) {
    console.error('❌ Connection test failed:', error.message);
    return false;
  }
}

async function testSimpleLLMCall() {
  console.log('\n🤖 Testing Simple LLM Call...');
  
  try {
    const response = await openRouterService.generateCompletion([
      {
        role: 'system',
        content: 'You are a helpful assistant. Respond with exactly "Test successful" if you understand this message.'
      },
      {
        role: 'user',
        content: 'Please confirm you can process this message.'
      }
    ], {
      interpreterType: 'jung',
      maxTokens: 50,
      temperature: 0
    });
    
    console.log('✅ LLM Response:', response.content);
    console.log(`🔢 Tokens Used: ${response.usage.totalTokens}`);
    console.log(`🎭 Model Used: ${response.model}`);
    
    return true;
  } catch (error) {
    console.error('❌ LLM call failed:', error.message);
    return false;
  }
}

async function testDreamInterpretation() {
  console.log('\n🌙 Testing Full Dream Interpretation...');
  
  try {
    console.log('🔍 Starting interpretation with mock data...');
    console.log(`📚 Dream: "${mockDreamData.dreamTranscription.substring(0, 100)}..."`);
    console.log(`🎭 Interpreter: ${mockDreamData.interpreterType}`);
    console.log(`🏷️ Themes: ${mockDreamData.themes.map(t => t.name).join(', ')}`);
    
    const result = await interpretationPipeline.interpretDream(mockDreamData);
    
    if (result.success && result.interpretation) {
      console.log('\n✅ Interpretation Successful!');
      console.log(`📝 Topic: ${result.interpretation.dreamTopic}`);
      console.log(`🔮 Symbols: ${result.interpretation.symbols.join(', ')}`);
      console.log(`💭 Quick Take: ${result.interpretation.quickTake}`);
      console.log(`📖 Interpretation Length: ${result.interpretation.interpretation.length} characters`);
      
      if (result.debugInfo) {
        console.log('\n🔧 Debug Info:');
        console.log(`⏱️ Total Duration: ${result.debugInfo.totalDuration}ms`);
        console.log(`🔢 Total Tokens: ${result.debugInfo.tokensUsed}`);
        console.log(`🔄 Retry Count: ${result.debugInfo.retryCount}`);
        console.log(`📋 Stages: ${result.debugInfo.stagesCompleted.join(' → ')}`);
      }
      
      // Show authenticity markers
      if (result.interpretation.authenticityMarkers) {
        console.log('\n🎭 Authenticity Markers:');
        Object.entries(result.interpretation.authenticityMarkers).forEach(([key, value]) => {
          console.log(`  ${key}: ${(value as number * 100).toFixed(1)}%`);
        });
      }
      
      return true;
    } else {
      console.error('❌ Interpretation failed:', result.error);
      return false;
    }
  } catch (error) {
    console.error('❌ Interpretation error:', error.message);
    if (error.stack) {
      console.error('Stack trace:', error.stack);
    }
    return false;
  }
}

async function testCostSummary() {
  console.log('\n💰 Testing Cost Summary...');
  
  try {
    const costSummary = openRouterService.getCostSummary();
    
    console.log('💵 Cost Summary:');
    console.log(`  Total Cost: $${costSummary.totalCost.toFixed(4)}`);
    console.log(`  Total Requests: ${costSummary.totalRequests}`);
    console.log(`  Total Tokens: ${costSummary.totalTokens}`);
    
    if (Object.keys(costSummary.costByModel).length > 0) {
      console.log('  Cost by Model:');
      Object.entries(costSummary.costByModel).forEach(([model, cost]) => {
        console.log(`    ${model}: $${cost.toFixed(4)}`);
      });
    }
    
    return true;
  } catch (error) {
    console.error('❌ Cost summary test failed:', error.message);
    return false;
  }
}

async function runAllTests() {
  console.log('🚀 Starting OpenRouter Integration Tests');
  console.log('=====================================');
  
  // Show current configuration
  const config = dreamInterpretationConfig.getLLMConfig();
  console.log('⚙️ Current Configuration:');
  console.log(`  Provider: ${config.provider}`);
  console.log(`  Primary Model: ${config.primaryModel}`);
  console.log(`  Fallback Model: ${config.fallbackModel || 'None'}`);
  console.log(`  Base URL: ${config.baseUrl}`);
  console.log(`  API Key: ${config.apiKey ? '✅ Set' : '❌ Missing'}`);
  
  if (!config.apiKey) {
    console.error('\n❌ OPENROUTER_API_KEY environment variable is required!');
    console.log('Please set your OpenRouter API key:');
    console.log('export OPENROUTER_API_KEY="your-api-key-here"');
    process.exit(1);
  }
  
  const tests = [
    { name: 'Connection Test', fn: testOpenRouterConnection },
    { name: 'Simple LLM Call', fn: testSimpleLLMCall },
    { name: 'Cost Summary', fn: testCostSummary },
    { name: 'Dream Interpretation', fn: testDreamInterpretation }
  ];
  
  const results = [];
  
  for (const test of tests) {
    try {
      const success = await test.fn();
      results.push({ name: test.name, success });
    } catch (error) {
      console.error(`❌ ${test.name} crashed:`, error.message);
      results.push({ name: test.name, success: false });
    }
  }
  
  // Summary
  console.log('\n📊 Test Results Summary');
  console.log('=======================');
  
  const passed = results.filter(r => r.success).length;
  const total = results.length;
  
  results.forEach(result => {
    console.log(`${result.success ? '✅' : '❌'} ${result.name}`);
  });
  
  console.log(`\n🎯 Overall: ${passed}/${total} tests passed`);
  
  if (passed === total) {
    console.log('🎉 All tests passed! OpenRouter integration is working.');
  } else {
    console.log('⚠️ Some tests failed. Check the configuration and API key.');
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  runAllTests().catch(error => {
    console.error('❌ Test runner crashed:', error);
    process.exit(1);
  });
}

export {
  testOpenRouterConnection,
  testSimpleLLMCall,
  testDreamInterpretation,
  testCostSummary,
  mockDreamData
};