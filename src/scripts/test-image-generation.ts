#!/usr/bin/env node
import * as dotenv from 'dotenv';
import { openRouterService } from '../services/openrouter';
import { imageRouterService } from '../services/imageRouter';
import { supabaseService } from '../services/supabase';
import logger from '../utils/logger';

// Load environment variables
dotenv.config();

const testDreamTranscript = `I was walking through a forest made of glass. The trees were transparent and sparkled in the sunlight. 
There were birds flying above but they looked like origami made from colored paper. 
I felt peaceful but also curious about where the path would lead.`;

async function testImageGeneration() {
  try {
    logger.info('Starting image generation test...');

    // Step 1: Generate metadata (title + image prompt) in batched call
    logger.info('Step 1: Generating dream metadata (title + image prompt)...');
    const metadata = await openRouterService.generateDreamMetadata(testDreamTranscript, {
      dreamId: 'test-' + Date.now()
    });
    const sceneDescription = metadata.imagePrompt;
    logger.info('Metadata generated:', { 
      title: metadata.title,
      imagePrompt: sceneDescription,
      model: metadata.model,
      usage: metadata.usage
    });

    // Step 2: Generate image
    logger.info('Step 2: Generating image...');
    const imageUrl = await imageRouterService.generateDreamImage(sceneDescription);
    logger.info('Image generated:', { imageUrl });
    
    // Check if imageUrl is valid
    if (!imageUrl || imageUrl === 'undefined') {
      throw new Error('Invalid image URL returned from ImageRouter');
    }

    // Step 3: Download image
    logger.info('Step 3: Downloading image...');
    const imageBuffer = await imageRouterService.downloadImage(imageUrl);
    logger.info('Image downloaded:', { bufferSize: imageBuffer.length });

    // Step 4: Upload to Supabase (using a test dream ID)
    const testDreamId = 'test-' + Date.now();
    logger.info('Step 4: Uploading to Supabase...');
    const uploadedUrl = await supabaseService.uploadDreamImage(testDreamId, imageBuffer);
    logger.info('Image uploaded to Supabase:', { uploadedUrl });

    logger.info('✅ Image generation test completed successfully!');
    logger.info('Final results:', {
      sceneDescription,
      originalImageUrl: imageUrl,
      supabaseImageUrl: uploadedUrl,
      imagePrompt: sceneDescription,
    });

  } catch (error) {
    logger.error('❌ Image generation test failed:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });
    process.exit(1);
  }
}

// Run the test
testImageGeneration().then(() => {
  logger.info('Test script completed');
  process.exit(0);
});