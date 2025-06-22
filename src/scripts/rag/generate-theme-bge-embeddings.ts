#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js';
import { config } from '../../config';
import { bgeEmbeddingsService } from '../../services/embeddings-bge.service';
import { logger } from '../../utils/logger';
import * as fs from 'fs';
import * as path from 'path';

interface Theme {
  code: string;
  label: string;
  description: string;
}

async function generateThemeBGEEmbeddings() {
  const supabase = createClient(
    config.supabase.url,
    config.supabase.serviceRoleKey
  );

  logger.info('🚀 Starting BGE-M3 theme embedding generation...');

  try {
    // Load themes from JSON
    const themesPath = path.join(process.cwd(), 'supabase', 'scripts', 'themes.json');
    const themesData = JSON.parse(fs.readFileSync(themesPath, 'utf-8'));
    const themes: Theme[] = themesData.themes;
    
    logger.info(`📋 Loaded ${themes.length} themes from themes.json`);

    // Initialize BGE service
    logger.info('🔧 Initializing BGE-M3 service...');
    const testEmbedding = await bgeEmbeddingsService.generateFullEmbedding('test');
    logger.info(`✅ BGE-M3 ready (${testEmbedding.dense.length} dimensions)`);

    let processed = 0;
    let failed = 0;

    // Process each theme
    for (const theme of themes) {
      try {
        // Generate embedding for theme
        const themeText = `${theme.label}. ${theme.description}`;
        logger.info(`\n🎯 Processing theme: ${theme.code} - ${theme.label}`);
        
        const embedding = await bgeEmbeddingsService.generateFullEmbedding(themeText);
        
        // Update in database using the new function
        const { data, error } = await supabase.rpc('update_theme_embedding_bge', {
          theme_code: theme.code,
          theme_embedding: embedding.dense
        });

        if (error) {
          logger.error(`❌ Failed to update ${theme.code}:`, error);
          failed++;
        } else {
          logger.info(`✅ Updated ${theme.code} with BGE-M3 embedding`);
          processed++;
        }

        // Small delay to avoid overwhelming the service
        await new Promise(resolve => setTimeout(resolve, 500));

      } catch (error) {
        logger.error(`❌ Error processing ${theme.code}:`, error);
        failed++;
      }
    }

    // Verify embeddings were created
    const { count } = await supabase
      .from('themes')
      .select('*', { count: 'exact', head: true })
      .not('embedding_bge', 'is', null);

    logger.info(`\n✅ Theme BGE embedding generation complete!`);
    logger.info(`📊 Stats:`);
    logger.info(`   - Total themes: ${themes.length}`);
    logger.info(`   - Processed: ${processed}`);
    logger.info(`   - Failed: ${failed}`);
    logger.info(`   - Verified in DB: ${count || 0}`);

  } catch (error) {
    logger.error('Fatal error:', error);
    process.exit(1);
  } finally {
    await bgeEmbeddingsService.cleanup();
    logger.info('🧹 Cleaned up BGE-M3 service');
  }
}

// Run if called directly
if (require.main === module) {
  generateThemeBGEEmbeddings()
    .then(() => {
      logger.info('\n✅ Done!');
      process.exit(0);
    })
    .catch(error => {
      logger.error('Fatal error:', error);
      process.exit(1);
    });
}