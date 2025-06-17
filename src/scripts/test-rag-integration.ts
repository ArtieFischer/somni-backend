import { PromptBuilderService } from '../prompts/factory.js';
import { features } from '../config/features.js';
import type { DreamAnalysisRequest } from '../prompts/base.js';

async function testRAGIntegration() {
  console.log('🧪 Testing RAG Integration in Jung Prompt Builder...\n');
  
  // Check feature flags
  console.log('📋 Feature Flags:');
  console.log(`  RAG Enabled: ${features.rag.enabled}`);
  console.log(`  Jung RAG Enabled: ${features.rag.interpreters.jung}\n`);
  
  // Create a test dream
  const testDream: DreamAnalysisRequest = {
    dreamTranscription: `I dreamed I was in a dark forest, and suddenly I encountered 
    my shadow self. We had a conversation about my fears and then merged into one. 
    There was a bright light and I woke up feeling transformed.`,
    interpreterType: 'jung',
    analysisDepth: 'initial',
    userContext: {
      age: 35,
      currentLifeSituation: 'Going through major life transition'
    }
  };
  
  console.log('🌙 Test Dream:');
  console.log(`"${testDream.dreamTranscription}"\n`);
  
  try {
    // Build the prompt
    console.log('⚙️ Building Jung prompt with RAG...');
    const result = await PromptBuilderService.buildInterpretationPrompt(testDream);
    const prompt = result.prompt;
    
    // Check if RAG context was added
    const hasRAGSection = prompt.outputFormat.includes('RELEVANT KNOWLEDGE FROM JUNG\'S WORKS:');
    console.log(`\n✅ RAG Section Added: ${hasRAGSection}`);
    console.log(`📊 Has RAG Context Variable: ${prompt.variables.hasRAGContext}`);
    
    // Look for RAG content
    if (hasRAGSection) {
      const ragStart = prompt.outputFormat.indexOf('RELEVANT KNOWLEDGE FROM JUNG\'S WORKS:');
      const ragEnd = prompt.outputFormat.indexOf('================================================================================', ragStart);
      
      if (ragStart !== -1 && ragEnd !== -1) {
        const ragContent = prompt.outputFormat.substring(ragStart, ragEnd);
        const passageCount = (ragContent.match(/^\d+\. From/gm) || []).length;
        const symbolCount = (ragContent.match(/^- \w+:/gm) || []).length;
        
        console.log(`📚 Found ${passageCount} passages in RAG context`);
        console.log(`🔮 Found ${symbolCount} symbol interpretations`);
        
        // Show a sample of the RAG content
        console.log('\n📄 RAG Content Preview:');
        console.log(ragContent.substring(0, 500) + '...\n');
      }
    } else {
      console.log('\n❌ No RAG section found in the prompt!');
      console.log('This suggests RAG integration is not working properly.\n');
    }
    
    // Show prompt structure
    console.log('📋 Prompt Structure:');
    console.log(`  System Prompt Length: ${prompt.systemPrompt.length}`);
    console.log(`  Analysis Structure Length: ${prompt.analysisStructure.length}`);
    console.log(`  Output Format Length: ${prompt.outputFormat.length}`);
    console.log(`  Total Prompt Length: ${prompt.systemPrompt.length + prompt.analysisStructure.length + prompt.outputFormat.length}`);
    
  } catch (error) {
    console.error('❌ Error building prompt:', error);
  }
}

// Run the test
testRAGIntegration().catch(console.error);