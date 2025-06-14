const axios = require('axios');

async function debugRawAIResponse() {
  console.log('🔍 Capturing Raw AI Response Format...\n');

  const dreamContent = "I found myself flying over a vast, deep blue ocean. The water was so clear I could see all the way to the bottom, where ancient ruins of a sunken city lay covered in golden light. As I flew, I felt both incredibly free and terrified of falling.";
  
  try {
    console.log('📝 Dream Content:', dreamContent.substring(0, 100) + '...');
    console.log('🎯 Interpreter: Jungian');
    console.log('🧪 Analysis Depth: initial\n');
    
    const startTime = Date.now();
    
    const response = await axios.post('http://localhost:3000/api/dreams/interpret', {
      dreamTranscription: dreamContent,
      interpreterType: 'jung',
      analysisDepth: 'initial',
      userContext: '35-year-old in career transition'
    }, {
      headers: {
        'X-API-Secret': '39a7294a9bdcc74712658060bfdbaa18442f03ac03f57fcb8bc1eea98e22ee27',
        'Content-Type': 'application/json'
      }
    });
    
    const duration = Date.now() - startTime;
    console.log(`⏱️  Response in ${duration}ms`);
    console.log(`📊 Status: ${response.status}`);
    
    if (response.status === 200) {
      console.log('✅ SUCCESS!\n');
      
      // Log the raw AI response content
      console.log('🤖 RAW AI RESPONSE (first 2000 chars):');
      console.log('=' .repeat(80));
      
      if (response.data && response.data.aiResponse) {
        const rawResponse = response.data.aiResponse;
        console.log(rawResponse.substring(0, 2000));
        console.log('=' .repeat(80));
        console.log(`📏 Total Response Length: ${rawResponse.length} chars\n`);
        
        // Show the last part too
        if (rawResponse.length > 2000) {
          console.log('🤖 RAW AI RESPONSE (last 1000 chars):');
          console.log('=' .repeat(80));
          console.log(rawResponse.substring(rawResponse.length - 1000));
          console.log('=' .repeat(80));
        }
        
        // Show parsed result for comparison
        console.log('\n🧠 PARSED RESULT:');
        console.log('=' .repeat(80));
        console.log(JSON.stringify(response.data.interpretation, null, 2));
        console.log('=' .repeat(80));
        
      } else {
        console.log('❌ No aiResponse found in response data');
        console.log('Response data:', JSON.stringify(response.data, null, 2));
      }
      
    } else {
      console.log('❌ FAILED!');
      console.log('Response:', response.data);
    }
    
  } catch (error) {
    console.log('❌ ERROR!');
    if (error.response) {
      console.log('Status:', error.response.status);
      console.log('Data:', error.response.data);
    } else {
      console.log('Error:', error.message);
    }
  }
}

debugRawAIResponse(); 