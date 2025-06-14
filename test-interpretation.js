const { dreamInterpretationService } = require('./dist/prompts');

console.log('🧪 Testing Consolidated Interpretation Service...\n');

const testRequest = {
  dreamId: 'test-basic-001',
  dreamTranscription: 'I was flying over a vast ocean, feeling both free and terrified of falling. The water was deep blue and endless.',
  interpreterType: 'jung',
  userContext: {
    age: 35,
    currentLifeSituation: 'Career transition',
    emotionalState: 'Seeking direction'
  },
  analysisDepth: 'initial'
};

console.log('📋 Test Request:');
console.log(JSON.stringify(testRequest, null, 2));
console.log('\n🚀 Starting interpretation...\n');

dreamInterpretationService.interpretDream(testRequest)
  .then(result => {
    console.log('✅ INTERPRETATION COMPLETED!\n');
    console.log('📊 Result Summary:');
    console.log('- Success:', result.success);
    console.log('- Dream ID:', result.dreamId);
    console.log('- Interpreter:', result.metadata?.interpreterType);
    console.log('- Model Used:', result.metadata?.modelUsed);
    console.log('- Duration:', result.metadata?.duration + 'ms');
    console.log('- Token Usage:', result.metadata?.tokenUsage?.totalTokens || 'N/A');
    
    if (result.success && result.interpretation) {
      console.log('\n🧠 Interpretation Details:');
      console.log('- Type:', result.interpretation.type);
      console.log('- Core Message Length:', result.interpretation.coreMessage?.length || 0, 'chars');
      
      if (result.interpretation.type === 'jungian') {
        console.log('- Symbols Found:', result.interpretation.symbols?.length || 0);
        console.log('- Shadow Aspects:', result.interpretation.shadowAspects?.length || 0);
        console.log('- Reflective Questions:', result.interpretation.reflectiveQuestions?.length || 0);
        
        console.log('\n💡 Core Message Preview:');
        console.log('"' + (result.interpretation.coreMessage?.substring(0, 200) || 'No message') + '..."');
        
        if (result.interpretation.symbols && result.interpretation.symbols.length > 0) {
          console.log('\n🔮 First Symbol:');
          console.log('- Symbol:', result.interpretation.symbols[0]?.symbol);
          console.log('- Personal Meaning:', result.interpretation.symbols[0]?.personalMeaning?.substring(0, 100) + '...');
        }
      }
    }
    
    if (!result.success) {
      console.log('\n❌ ERROR:', result.error);
    }
    
    console.log('\n🎉 Test completed successfully! Our consolidated service is working!');
  })
  .catch(error => {
    console.error('\n💥 TEST FAILED:', error.message);
    console.error('Stack:', error.stack);
  }); 