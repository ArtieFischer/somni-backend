#!/usr/bin/env node
import * as dotenv from 'dotenv';
import { supabaseService } from '../services/supabase';
import logger from '../utils/logger';

// Load environment variables
dotenv.config();

async function setupImageBucket() {
  try {
    logger.info('Setting up dream-images storage bucket...');
    
    const success = await supabaseService.ensureDreamImagesBucket();
    
    if (success) {
      logger.info('✅ Dream images bucket is ready!');
    } else {
      logger.error('❌ Failed to set up dream images bucket');
      process.exit(1);
    }
  } catch (error) {
    logger.error('Error setting up bucket:', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    process.exit(1);
  }
}

// Run the setup
setupImageBucket().then(() => {
  logger.info('Bucket setup completed');
  process.exit(0);
});