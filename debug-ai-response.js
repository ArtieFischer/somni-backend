#!/usr/bin/env node

/**
 * Debug AI Response - Quick test to see what the AI is returning
 */

const http = require('http');
const { randomUUID } = require('crypto');

const config = {
  baseUrl: 'http://localhost:3000',
  apiSecret: '39a7294a9bdcc74712658060bfdbaa18442f03ac03f57fcb8bc1eea98e22ee27',
  testRequest: {
    dreamId: randomUUID(),
    dreamTranscription: 'I was flying over a blue ocean and saw ancient ruins below. A wise woman gave me a golden key.',
    interpreterType: 'jung',
    analysisDepth: 'initial', // Use initial for faster response
    userContext: {
      age: 35,
      currentLifeSituation: 'Career transition'
    }
  }
};

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
            data: parsedData
          });
        } catch (error) {
          resolve({
            statusCode: res.statusCode,
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

async function debugAIResponse() {
  try {
    console.log('🔍 Quick AI Response Debug Test...\n');
    console.log('📝 Simple Dream:', config.testRequest.dreamTranscription);
    console.log('🎯 Analysis Depth: initial (for speed)\n');
    
    const startTime = Date.now();
    const response = await makeRequest('/api/v1/interpretation/test/interpret', 'POST', config.testRequest);
    const duration = Date.now() - startTime;
    
    console.log(`⏱️  Response in ${duration}ms`);
    console.log('📊 Status:', response.statusCode);
    
    if (response.statusCode === 200 && response.data.success) {
      console.log('✅ SUCCESS!\n');
      
      const interpretation = response.data.interpretation;
      console.log('🧠 PARSED JUNGIAN RESPONSE:');
      console.log('💡 Core Message:', interpretation.coreMessage?.substring(0, 100) + '...');
      console.log('🌟 Phenomenological Opening:', interpretation.phenomenologicalOpening?.substring(0, 100) + '...');
      console.log('🔮 Symbols Found:', interpretation.symbols?.length || 0);
      console.log('❓ Questions Found:', interpretation.reflectiveQuestions?.length || 0);
      console.log('🌑 Shadow Aspects:', interpretation.shadowAspects?.length || 0);
      console.log('🔥 Big Dream:', interpretation.isBigDream);
      
      if (interpretation.symbols && interpretation.symbols.length > 0) {
        console.log('\n📋 First Symbol:');
        console.log('   Symbol:', interpretation.symbols[0].symbol);
        console.log('   Personal:', interpretation.symbols[0].personalMeaning?.substring(0, 80) + '...');
      }
      
      if (interpretation.reflectiveQuestions && interpretation.reflectiveQuestions.length > 0) {
        console.log('\n❓ First Question:', interpretation.reflectiveQuestions[0]);
      }
      
    } else {
      console.log('❌ FAILED');
      console.log('📄 Response:', JSON.stringify(response.data, null, 2));
    }
    
  } catch (error) {
    console.log('💥 ERROR:', error.message);
  }
}

debugAIResponse(); 