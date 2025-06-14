#!/usr/bin/env node

/**
 * Live AI Integration Test Script
 * Tests the complete dream interpretation pipeline with real AI
 */

const https = require('https');
const http = require('http');
const { randomUUID } = require('crypto');

// Configuration
const config = {
  baseUrl: 'http://localhost:3000',
  apiSecret: process.env.API_SECRET_KEY || '39a7294a9bdcc74712658060bfdbaa18442f03ac03f57fcb8bc1eea98e22ee27',
  
  // Test dream with rich symbolic content for Jungian analysis
  testDream: `I found myself flying over a vast, deep blue ocean. The water was so clear I could see all the way to the bottom, where ancient ruins of a sunken city lay covered in golden light. As I flew, I felt both incredibly free and terrified of falling. Suddenly, an old wise woman appeared floating beside me, her silver hair flowing in the wind. She smiled knowingly and handed me a golden key, saying "This opens the door you've been afraid to walk through." I woke up feeling both shaken and strangely peaceful.`,
  
  testRequest: {
    dreamId: randomUUID(),
    interpreterType: 'jung',
    analysisDepth: 'deep',
    userContext: {
      age: 35,
      currentLifeSituation: 'Career transition and seeking deeper meaning',
      emotionalState: 'Anxious but hopeful about change',
      recurringSymbols: ['water', 'flying', 'wise figures'],
      recentMajorEvents: ['Job change', 'Starting therapy']
    },
    specialPrompts: {
      synchronicity: 'I met an elderly woman at a bookstore yesterday who reminded me of the dream figure',
      isNightmare: false
    }
  }
};

// Add the dream transcription to the test request
config.testRequest.dreamTranscription = config.testDream;

console.log('🚀 Testing Live AI Integration...\n');
console.log('📝 Test Dream:', config.testDream.substring(0, 100) + '...\n');
console.log('🎯 Interpreter: Jungian (Deep Analysis)\n');
console.log('👤 User Context: 35-year-old in career transition\n');

function makeRequest(endpoint, method = 'POST', data = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(endpoint, config.baseUrl);
    const options = {
      hostname: url.hostname,
      port: url.port || 3000,
      path: url.pathname,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'X-API-Secret': config.apiSecret
      }
    };

    if (data) {
      const jsonData = JSON.stringify(data);
      options.headers['Content-Length'] = Buffer.byteLength(jsonData);
    }

    const req = http.request(options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        try {
          const parsedData = JSON.parse(responseData);
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            data: parsedData
          });
        } catch (error) {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            data: responseData
          });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    if (data) {
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
}

async function testLiveIntegration() {
  try {
    console.log('⏱️  Starting live interpretation test...\n');
    const startTime = Date.now();
    
    // Test the live interpretation endpoint
    const response = await makeRequest('/api/v1/interpretation/test/interpret', 'POST', config.testRequest);
    
    const duration = Date.now() - startTime;
    
    console.log(`🎉 Response received in ${duration}ms!\n`);
    console.log('📊 Status Code:', response.statusCode);
    
    if (response.statusCode === 200 && response.data.success) {
      console.log('✅ SUCCESS: Live AI interpretation completed!\n');
      
      const interpretation = response.data.interpretation;
      const metadata = response.data.metadata;
      
      console.log('🤖 Model Used:', metadata.modelUsed);
      console.log('🔢 Token Usage:', metadata.tokenUsage);
      console.log('💰 Cost Summary:', metadata.costSummary);
      console.log('📏 Analysis Depth:', metadata.analysisDepth);
      console.log('⏱️  Processing Duration:', metadata.duration + 'ms\n');
      
      if (interpretation.type === 'jungian') {
        console.log('🧠 JUNGIAN INTERPRETATION RESULTS:\n');
        console.log('💡 Core Message:');
        console.log('   ', interpretation.coreMessage, '\n');
        
        console.log('🌟 Phenomenological Opening:');
        console.log('   ', interpretation.phenomenologicalOpening, '\n');
        
        console.log('🔮 Symbols Detected:', interpretation.symbols.length);
        interpretation.symbols.slice(0, 2).forEach((symbol, i) => {
          console.log(`   ${i + 1}. ${symbol.symbol}:`);
          console.log(`      Personal: ${symbol.personalMeaning}`);
          console.log(`      Cultural: ${symbol.culturalMeaning}`);
          console.log(`      Archetypal: ${symbol.archetypalMeaning}\n`);
        });
        
        console.log('⚖️  Compensatory Function:');
        console.log('   ', interpretation.compensatoryFunction, '\n');
        
        console.log('🌱 Individuation Guidance:');
        console.log('   ', interpretation.individuationGuidance, '\n');
        
        console.log('❓ Reflective Questions:');
        interpretation.reflectiveQuestions.forEach((q, i) => {
          console.log(`   ${i + 1}. ${q}`);
        });
        
        console.log('\n🔥 Big Dream Status:', interpretation.isBigDream ? 'YES - Archetypal significance detected!' : 'No');
        
        if (interpretation.shadowAspects && interpretation.shadowAspects.length > 0) {
          console.log('\n🌑 Shadow Aspects:');
          interpretation.shadowAspects.forEach((aspect, i) => {
            console.log(`   ${i + 1}. ${aspect}`);
          });
        }
        
        if (interpretation.activeImaginationExercise) {
          console.log('\n🎭 Active Imagination Exercise:');
          console.log('   ', interpretation.activeImaginationExercise);
        }
        
        if (interpretation.synchronicityConnection) {
          console.log('\n✨ Synchronicity Connection:');
          console.log('   ', interpretation.synchronicityConnection);
        }
      }
      
      console.log('\n🎊 LIVE AI INTEGRATION TEST SUCCESSFUL!');
      console.log('🚀 The dream interpretation pipeline is fully operational!');
      
    } else {
      console.log('❌ FAILED: Response indicates error');
      console.log('📄 Response:', JSON.stringify(response.data, null, 2));
    }
    
  } catch (error) {
    console.log('💥 ERROR during test:', error.message);
    console.log('🔧 Make sure the server is running: npm run dev');
    console.log('🔑 Check your .env file has OPENROUTER_API_KEY set');
  }
}

// Test different endpoints
async function runAllTests() {
  console.log('🧪 LIVE AI INTEGRATION TEST SUITE\n');
  console.log('=' .repeat(50) + '\n');
  
  try {
    // Test 1: Health check
    console.log('🔍 Test 1: Server Health Check...');
    const healthResponse = await makeRequest('/health', 'GET');
    if (healthResponse.statusCode === 200) {
      console.log('✅ Server is running!\n');
    } else {
      throw new Error('Server health check failed');
    }
    
    // Test 2: Interpreter types
    console.log('🔍 Test 2: Available Interpreters...');
    const interpretersResponse = await makeRequest('/api/v1/interpretation/test/interpreters', 'GET');
    if (interpretersResponse.statusCode === 200) {
      console.log('✅ Interpreters available:', Object.keys(interpretersResponse.data.interpreters).join(', '), '\n');
    }
    
    // Test 3: Live AI interpretation
    console.log('🔍 Test 3: Live AI Interpretation...');
    await testLiveIntegration();
    
  } catch (error) {
    console.log('\n💥 Test suite failed:', error.message);
    console.log('🔧 Troubleshooting:');
    console.log('   1. Make sure server is running: npm run dev');
    console.log('   2. Check .env file has all required variables');
    console.log('   3. Verify OPENROUTER_API_KEY is valid');
    console.log('   4. Check API_SECRET_KEY matches your configuration');
  }
}

// Run the tests
if (require.main === module) {
  runAllTests();
}

module.exports = { testLiveIntegration, makeRequest, config }; 