import { MaryPromptBuilder } from '../../prompts/interpreters/mary/builder';
import { MaryRAGPromptBuilder } from '../../prompts/interpreters/mary/builder-with-rag';
import type { DreamAnalysisRequest } from '../../prompts/base';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Compare Mary's interpretations with and without RAG enhancement
 */
async function compareMaryBuilders() {
  console.log('Comparing Mary interpretations: Standard vs RAG-enhanced\n');

  const standardBuilder = new MaryPromptBuilder();
  const ragBuilder = new MaryRAGPromptBuilder();

  const testDream: DreamAnalysisRequest = {
    dreamTranscription: `I was in a sleep laboratory watching brain scans on multiple monitors. The patterns were beautiful, like fireworks. Suddenly I realized the brain on the screen was mine, and I could see my own thoughts forming as colorful waves. I felt both fascinated and frightened.`,
    interpreterType: 'mary',
    analysisDepth: 'deep',
    userContext: {
      age: 32,
      emotionalState: "curious about consciousness",
      currentLifeSituation: "Reading about neuroscience",
      recentMajorEvents: ["Started meditation practice", "Considering career change"]
    }
  };

  const results: any = {
    timestamp: new Date().toISOString(),
    dreamSummary: testDream.dreamTranscription.substring(0, 100) + '...',
    comparisons: []
  };

  try {
    // Generate standard prompt
    console.log('Generating standard Mary prompt...');
    const standardPrompt = standardBuilder.buildPrompt(testDream);
    
    // Generate RAG-enhanced prompt
    console.log('\nGenerating RAG-enhanced Mary prompt...');
    const ragPrompt = await ragBuilder.buildPromptAsync(testDream);
    const ragContext = ragBuilder.getLastRetrievedContext();
    
    // Compare prompts
    results.comparisons.push({
      type: 'standard',
      promptLength: standardPrompt.outputFormat.length,
      hasRAGContext: false,
      promptPreview: standardPrompt.outputFormat.substring(0, 500) + '...'
    });

    results.comparisons.push({
      type: 'rag-enhanced',
      promptLength: ragPrompt.outputFormat.length,
      hasRAGContext: true,
      ragPassages: ragContext?.passages?.length || 0,
      promptPreview: ragPrompt.outputFormat.substring(0, 500) + '...',
      ragContext: {
        passageCount: ragContext?.passages?.length || 0,
        sources: ragContext?.passages?.map((p: any) => p.source || p.metadata?.source).filter(Boolean) || [],
        themes: ragContext?.metadata?.boost?.subtopic || []
      }
    });

    // Display comparison
    console.log('\n📊 COMPARISON RESULTS:');
    console.log('='.repeat(80));
    
    console.log('\n🔬 Standard Mary Prompt:');
    console.log(`- Length: ${results.comparisons[0].promptLength} characters`);
    console.log('- RAG Context: None');
    
    console.log('\n🧠 RAG-Enhanced Mary Prompt:');
    console.log(`- Length: ${results.comparisons[1].promptLength} characters`);
    console.log(`- RAG Passages: ${results.comparisons[1].ragPassages}`);
    console.log(`- Sources: ${results.comparisons[1].ragContext.sources.join(', ')}`);
    console.log(`- Themes: ${results.comparisons[1].ragContext.themes.join(', ')}`);
    
    console.log('\n📈 Size Increase: ' + 
      Math.round((results.comparisons[1].promptLength / results.comparisons[0].promptLength - 1) * 100) + '%');

    // Save detailed comparison
    const outputPath = path.join(__dirname, '../../../test-results');
    if (!fs.existsSync(outputPath)) {
      fs.mkdirSync(outputPath, { recursive: true });
    }
    
    const filename = `mary-builders-comparison-${new Date().toISOString().split('T')[0]}.json`;
    fs.writeFileSync(
      path.join(outputPath, filename),
      JSON.stringify(results, null, 2)
    );
    
    console.log(`\n💾 Detailed comparison saved to: test-results/${filename}`);
    
    // Show prompt samples
    console.log('\n📝 PROMPT SAMPLES:');
    console.log('='.repeat(80));
    console.log('\nStandard Prompt (first 500 chars):');
    console.log(results.comparisons[0].promptPreview);
    console.log('\nRAG-Enhanced Prompt (first 500 chars):');
    console.log(results.comparisons[1].promptPreview);
    
    console.log('\n📌 Note: To generate actual AI interpretations, integrate with your LLM service.');
    console.log('The prompts above show how RAG enhancement adds scientific context to Mary\'s interpretations.');

  } catch (error) {
    console.error('Error during comparison:', error);
    results.error = error instanceof Error ? error.message : 'Unknown error';
  }

  return results;
}

// Run the comparison
if (require.main === module) {
  compareMaryBuilders()
    .then(() => {
      console.log('\n✅ Comparison complete!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Comparison failed:', error);
      process.exit(1);
    });
}

export { compareMaryBuilders };