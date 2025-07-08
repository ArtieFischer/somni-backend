import { openRouterService } from '../services/openrouter';
import { logger } from '../utils/logger';

async function testMetadataGeneration() {
  const testTranscript = `I was in a beautiful garden with colorful flowers everywhere. 
  The sun was shining brightly and I felt very peaceful. There were butterflies 
  flying around and a small stream running through the garden. I sat on a wooden 
  bench and just enjoyed the tranquility of the moment.`;

  logger.info('Testing dream metadata generation with fallback chain');

  try {
    // Test 1: With default model (should use fallback chain)
    logger.info('Test 1: Using default model configuration');
    const result1 = await openRouterService.generateDreamMetadata(testTranscript, {
      dreamId: 'test-dream-1'
    });
    
    logger.info('Test 1 successful', {
      title: result1.title,
      imagePrompt: result1.imagePrompt,
      mood: result1.mood,
      clarity: result1.clarity,
      model: result1.model,
      usage: result1.usage
    });

    // Test 2: With explicit model that might fail (to test fallback)
    logger.info('Test 2: Using explicit model that might fail');
    const result2 = await openRouterService.generateDreamMetadata(testTranscript, {
      model: 'meta-llama/llama-4-scout:free',
      dreamId: 'test-dream-2'
    });
    
    logger.info('Test 2 successful', {
      title: result2.title,
      imagePrompt: result2.imagePrompt,
      mood: result2.mood,
      clarity: result2.clarity,
      model: result2.model,
      usage: result2.usage
    });

  } catch (error) {
    logger.error('Test failed', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

// Run the test
testMetadataGeneration().then(() => {
  logger.info('Test completed');
  process.exit(0);
}).catch((error) => {
  logger.error('Test failed with unhandled error', { error });
  process.exit(1);
});