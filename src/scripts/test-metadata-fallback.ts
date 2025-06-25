import { openRouterService } from '../services/openrouter';
import { logger } from '../utils/logger';

async function testMetadataGenerationFallback() {
  console.log('Testing metadata generation fallback logic...\n');
  
  const testTranscript = `I had a dream where I was flying over a vast ocean. The water was crystal clear and I could see colorful fish swimming below. Suddenly, I found myself in a beautiful garden with flowers of every color imaginable. There was a golden butterfly that led me through a maze of roses.`;
  
  console.log('Test transcript:', testTranscript);
  console.log('\n' + '='.repeat(80) + '\n');
  
  try {
    console.log('Attempting metadata generation with default model chain...');
    
    const startTime = Date.now();
    const result = await openRouterService.generateDreamMetadata(testTranscript, {
      dreamId: 'test-metadata-fallback-' + Date.now()
    });
    
    const duration = Date.now() - startTime;
    
    console.log('\nMetadata generation successful!');
    console.log('Duration:', duration, 'ms');
    console.log('\nResult:');
    console.log('- Title:', result.title);
    console.log('- Image Prompt:', result.imagePrompt);
    console.log('- Model Used:', result.model);
    console.log('- Token Usage:', result.usage);
    
    // Test with forced primary model to see if it fails
    console.log('\n' + '='.repeat(80) + '\n');
    console.log('Testing with forced llama-4-scout model (expecting potential failure)...');
    
    try {
      const forcedResult = await openRouterService.generateDreamMetadata(testTranscript, {
        model: 'meta-llama/llama-4-scout:free',
        dreamId: 'test-forced-llama4-' + Date.now()
      });
      
      console.log('\nForced model result:');
      console.log('- Title:', forcedResult.title);
      console.log('- Image Prompt:', forcedResult.imagePrompt);
      console.log('- Model Used:', forcedResult.model);
      
    } catch (forcedError) {
      console.log('\nForced model failed as expected:', forcedError instanceof Error ? forcedError.message : forcedError);
    }
    
  } catch (error) {
    console.error('\nMetadata generation failed:', error instanceof Error ? error.message : error);
    
    // Check logs for fallback attempts
    console.log('\nCheck the logs for fallback attempts:');
    console.log('tail -n 50 ./logs/combined.log | grep -E "(metadata|fallback|503)"');
  }
  
  console.log('\n' + '='.repeat(80) + '\n');
  console.log('Test complete. Check logs for detailed fallback behavior.');
}

// Run the test
testMetadataGenerationFallback()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Test failed:', error);
    process.exit(1);
  });