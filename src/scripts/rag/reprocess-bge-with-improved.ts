#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js';
import { config } from '../../config';
import { improvedKnowledgeClassifier } from './core/knowledge-classifier-bge-improved';
import { logger } from '../../utils/logger';

async function reprocessWithImproved() {
  const supabase = createClient(
    config.supabase.url,
    config.supabase.serviceRoleKey
  );

  logger.info('🔄 Re-processing existing BGE data with improved classifier...');

  try {
    // Count total records
    const { count: totalCount } = await supabase
      .from('knowledge_base')
      .select('*', { count: 'exact', head: true })
      .eq('interpreter_type', 'jung')
      .eq('embedding_version', 'bge-m3');

    logger.info(`📊 Found ${totalCount || 0} BGE-M3 records to reprocess`);

    if (!totalCount || totalCount === 0) {
      logger.info('❌ No BGE-M3 records found. Run ingestion first.');
      return;
    }

    let processed = 0;
    let improved = 0;
    let errors = 0;
    const batchSize = 20;

    // Process in small batches
    for (let offset = 0; offset < totalCount; offset += batchSize) {
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

      logger.info(`\n📦 Processing batch ${Math.floor(offset / batchSize) + 1}/${Math.ceil(totalCount / batchSize)} (${records?.length || 0} records)`);

      for (const record of records || []) {
        try {
          // Re-classify with improved classifier
          const newClassification = await improvedKnowledgeClassifier.classifyContent(
            record.content,
            'jung'
          );

          // Compare with existing
          const oldThemes = record.metadata_v2?.applicable_themes || [];
          const newThemes = newClassification.applicable_themes || [];
          const oldType = record.content_type;
          const newType = newClassification.primary_type;

          const themesChanged = JSON.stringify(oldThemes.sort()) !== JSON.stringify(newThemes.sort());
          const typeChanged = oldType !== newType;

          if (themesChanged || typeChanged) {
            // Update record
            const updateData = {
              content_type: newType,
              metadata_v2: {
                ...newClassification,
                reprocessed_at: new Date().toISOString(),
                old_classification: {
                  type: oldType,
                  themes: oldThemes,
                  confidence: record.metadata_v2?.confidence
                }
              }
            };

            const { error: updateError } = await supabase
              .from('knowledge_base')
              .update(updateData)
              .eq('id', record.id);

            if (updateError) {
              logger.error(`Failed to update record ${record.id}:`, updateError);
              errors++;
            } else {
              improved++;
              
              // Log significant changes
              if (oldThemes.length > 3 && newThemes.length <= 1) {
                logger.info(`🎯 Reduced random themes: ${record.id}`);
                logger.info(`   Old: ${oldThemes.join(', ')} (${oldThemes.length})`);
                logger.info(`   New: ${newThemes.join(', ') || 'none'} (${newThemes.length})`);
              }
              
              if (typeChanged) {
                logger.debug(`🔄 Type change: ${oldType} → ${newType}`);
              }
            }
          }

          processed++;

          // Progress update
          if (processed % 50 === 0) {
            logger.info(`📈 Progress: ${processed}/${totalCount} (${improved} improved, ${errors} errors)`);
          }

        } catch (error) {
          logger.error(`Error processing record ${record.id}:`, error);
          errors++;
        }
      }

      // Small delay between batches
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    logger.info(`\n✅ Reprocessing complete!`);
    logger.info(`📊 Final stats:`);
    logger.info(`   - Total processed: ${processed}`);
    logger.info(`   - Records improved: ${improved}`);
    logger.info(`   - Errors: ${errors}`);
    logger.info(`   - Improvement rate: ${((improved / processed) * 100).toFixed(1)}%`);

    // Run inspection to see results
    logger.info(`\n🔍 Run inspection to see results:`);
    logger.info(`npx tsx src/scripts/rag/inspect-bge-data.ts`);

  } catch (error) {
    logger.error('Fatal error:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  reprocessWithImproved()
    .then(() => {
      logger.info('\n✅ Done!');
      process.exit(0);
    })
    .catch(error => {
      logger.error('Fatal error:', error);
      process.exit(1);
    });
}