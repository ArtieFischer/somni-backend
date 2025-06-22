#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js';
import { config } from '../../config';
import { knowledgeClassifierFixed } from './core/knowledge-classifier-bge-fixed';
import { logger } from '../../utils/logger';

async function fixBGEClassifications() {
  const supabase = createClient(
    config.supabase.url,
    config.supabase.serviceRoleKey
  );

  logger.info('🔧 Starting BGE classification fix...');

  try {
    // First, ensure theme embeddings are ready
    await knowledgeClassifierFixed.loadThemeEmbeddings();
    
    // Count total records to fix
    const { count: totalCount } = await supabase
      .from('knowledge_base')
      .select('*', { count: 'exact', head: true })
      .eq('interpreter_type', 'jung')
      .eq('embedding_version', 'bge-m3');

    logger.info(`📊 Found ${totalCount || 0} BGE-M3 records to fix`);

    let processed = 0;
    let fixed = 0;
    let failed = 0;
    const batchSize = 50;

    // Process in batches
    for (let offset = 0; offset < (totalCount || 0); offset += batchSize) {
      const { data: records, error } = await supabase
        .from('knowledge_base')
        .select('id, content, content_type, metadata_v2')
        .eq('interpreter_type', 'jung')
        .eq('embedding_version', 'bge-m3')
        .range(offset, offset + batchSize - 1);

      if (error) {
        logger.error('Error fetching batch:', error);
        continue;
      }

      logger.info(`\n📦 Processing batch ${Math.floor(offset / batchSize) + 1} (${records?.length || 0} records)`);

      for (const record of records || []) {
        try {
          // Re-classify with fixed classifier
          const newClassification = await knowledgeClassifierFixed.classifyContent(
            record.content,
            'jung'
          );

          // Compare with existing classification
          const oldThemes = record.metadata_v2?.applicable_themes || [];
          const newThemes = newClassification.applicable_themes || [];
          
          const themesChanged = JSON.stringify(oldThemes) !== JSON.stringify(newThemes);
          const typeChanged = record.content_type !== newClassification.primary_type;

          if (themesChanged || typeChanged) {
            // Update the record
            const updateData: any = {
              content_type: newClassification.primary_type,
              metadata_v2: {
                ...record.metadata_v2,
                ...newClassification,
                fixed_at: new Date().toISOString(),
                old_themes: oldThemes,
                old_type: record.content_type
              }
            };

            const { error: updateError } = await supabase
              .from('knowledge_base')
              .update(updateData)
              .eq('id', record.id);

            if (updateError) {
              logger.error(`Failed to update record ${record.id}:`, updateError);
              failed++;
            } else {
              fixed++;
              logger.debug(`✅ Fixed record ${record.id}:`);
              logger.debug(`   - Type: ${record.content_type} → ${newClassification.primary_type}`);
              logger.debug(`   - Themes: ${oldThemes.join(', ') || 'none'} → ${newThemes.join(', ') || 'none'}`);
            }
          }

          processed++;

          // Progress update
          if (processed % 100 === 0) {
            logger.info(`📈 Progress: ${processed}/${totalCount} (${fixed} fixed, ${failed} failed)`);
          }

        } catch (error) {
          logger.error(`Error processing record ${record.id}:`, error);
          failed++;
        }
      }

      // Small delay between batches
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    logger.info(`\n✅ BGE classification fix complete!`);
    logger.info(`📊 Final stats:`);
    logger.info(`   - Total records: ${totalCount || 0}`);
    logger.info(`   - Processed: ${processed}`);
    logger.info(`   - Fixed: ${fixed}`);
    logger.info(`   - Failed: ${failed}`);
    logger.info(`   - Unchanged: ${processed - fixed - failed}`);

  } catch (error) {
    logger.error('Fatal error:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  fixBGEClassifications()
    .then(() => {
      logger.info('\n✅ Done!');
      process.exit(0);
    })
    .catch(error => {
      logger.error('Fatal error:', error);
      process.exit(1);
    });
}