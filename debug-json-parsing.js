/**
 * Debug script to test JSON parsing issues in symbolic_analysis stage
 */

const { promptBuilder } = require('./dist/src/dream-interpretation/services/prompt-builder.js');

async function testSymbolicAnalysisStage() {
  try {
    console.log('Testing symbolic analysis stage...');
    
    // Mock dream context
    const dreamContext = {
      dreamId: 'test-dream-123',
      userId: 'test-user-456',
      dreamTranscription: 'I was flying over a vast ocean, then I found myself in a dark forest with a mysterious house. There was an old woman at the door who gave me a golden key.',
      themes: [
        { code: 'flying', name: 'Flying', relevanceScore: 0.8 },
        { code: 'house', name: 'House/Building', relevanceScore: 0.7 },
        { code: 'elder', name: 'Wise Elder', relevanceScore: 0.6 }
      ],
      symbols: ['ocean', 'forest', 'house', 'woman', 'key', 'door'],
      userContext: { age: 30 },
      previousDreams: [],
      interpretationDate: new Date()
    };
    
    // Build multi-stage prompts
    const multiStagePrompts = await promptBuilder.buildMultiStagePrompts(
      dreamContext,
      'jung'
    );
    
    console.log('Built multi-stage prompts:', multiStagePrompts.metadata);
    
    // Find the symbolic_analysis stage
    const symbolicAnalysisStage = multiStagePrompts.stages.find(
      stage => stage.name === 'symbolic_analysis'
    );
    
    if (!symbolicAnalysisStage) {
      console.error('symbolic_analysis stage not found!');
      return;
    }
    
    console.log('\n=== SYMBOLIC ANALYSIS STAGE ===');
    console.log('Name:', symbolicAnalysisStage.name);
    console.log('Type:', symbolicAnalysisStage.type);
    console.log('Output Format:', symbolicAnalysisStage.outputFormat);
    console.log('Temperature:', symbolicAnalysisStage.temperature);
    console.log('Max Tokens:', symbolicAnalysisStage.maxTokens);
    
    console.log('\n=== SYSTEM PROMPT ===');
    console.log(symbolicAnalysisStage.systemPrompt);
    
    console.log('\n=== USER PROMPT ===');
    console.log(symbolicAnalysisStage.prompt);
    
    console.log('\n=== EXPECTED JSON STRUCTURE ===');
    
    // Extract the JSON structure from the prompt
    const jsonStructureMatch = symbolicAnalysisStage.prompt.match(/\{[\s\S]*?\}/);
    if (jsonStructureMatch) {
      try {
        const jsonStructure = JSON.parse(jsonStructureMatch[0]);
        console.log('Parsed JSON structure successfully:', JSON.stringify(jsonStructure, null, 2));
      } catch (parseError) {
        console.error('JSON structure in prompt is invalid:', parseError.message);
        console.log('Raw JSON from prompt:', jsonStructureMatch[0]);
      }
    } else {
      console.log('No JSON structure found in prompt');
    }
    
  } catch (error) {
    console.error('Error testing symbolic analysis stage:', error);
    console.error('Stack:', error.stack);
  }
}

testSymbolicAnalysisStage();