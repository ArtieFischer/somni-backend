const { MaryRAGPromptBuilder } = require('./dist/prompts/interpreters/mary/builder-with-rag');

async function testMaryRAG() {
  const builder = new MaryRAGPromptBuilder();
  
  const request = {
    dreamTranscription: "I was back at my parents house, but it was way bigger than I remember. There were all these random animals just running around everywhere - like squirrels, a couple of cats, and this one really fat hamster that kept following me.",
    interpreterType: 'mary',
    analysisDepth: 'deep',
    testMode: true
  };
  
  console.log('Building prompt with RAG...\n');
  
  try {
    const prompt = await builder.buildPromptAsync(request);
    
    // Check if RAG context was retrieved
    const ragContext = builder.getLastRetrievedContext();
    console.log('RAG Context Retrieved:', ragContext ? 'YES' : 'NO');
    
    if (ragContext && ragContext.passages) {
      console.log(`Number of passages: ${ragContext.passages.length}`);
      console.log('\nFirst passage:', ragContext.passages[0]);
    }
    
    // Check if RAG is in the prompt
    const hasRAGSection = prompt.outputFormat.includes('RELEVANT NEUROSCIENCE RESEARCH:');
    console.log('\nRAG section in prompt:', hasRAGSection ? 'YES' : 'NO');
    
    if (hasRAGSection) {
      const ragStart = prompt.outputFormat.indexOf('RELEVANT NEUROSCIENCE RESEARCH:');
      const ragEnd = prompt.outputFormat.indexOf('IMPORTANT: Integrate these scientific insights');
      console.log('\nRAG section preview:');
      console.log(prompt.outputFormat.substring(ragStart, ragEnd + 50));
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}

testMaryRAG().catch(console.error);