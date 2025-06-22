import { createClient } from '@supabase/supabase-js';
import { config } from '../../config';
import { bgeEmbeddingsService } from '../../services/embeddings-bge.service';
import { knowledgeClassifier } from './core/knowledge-classifier';
import { logger } from '../../utils/logger';
import * as fs from 'fs/promises';
import * as path from 'path';

async function reingestWithBGE(interpreterType: string = 'jung') {
  const supabase = createClient(
    config.supabase.url,
    config.supabase.serviceRoleKey
  );

  logger.info(`Starting BGE-M3 re-ingestion process for ${interpreterType} texts...`);

  try {
    // 1. Mark migration as started
    const { error: migrationError } = await supabase
      .from('embedding_migrations')
      .update({ 
        status: 'in_progress',
        started_at: new Date().toISOString()
      })
      .eq('source_model', 'multi-qa-MiniLM-L6-cos-v1')
      .eq('target_model', 'bge-m3');

    if (migrationError) {
      logger.error('Failed to update migration status:', migrationError);
    }

    // 2. Fetch texts for specified interpreter
    const { data: texts, error } = await supabase
      .from('knowledge_base')
      .select('*')
      .eq('interpreter_type', interpreterType)
      .order('id');

    if (error) throw error;

    logger.info(`Found ${texts?.length || 0} ${interpreterType} texts to re-embed`);

    // 3. Process in batches
    const batchSize = 10;
    let processed = 0;
    let failed = 0;

    for (let i = 0; i < (texts?.length || 0); i += batchSize) {
      const batch = texts!.slice(i, i + batchSize);
      
      try {
        // Generate new embeddings
        const embeddings = await Promise.all(
          batch.map(async (text) => {
            const fullEmbedding = await bgeEmbeddingsService.generateFullEmbedding(
              text.content
            );
            
            // Classify with themes
            const classification = await knowledgeClassifier.classifyContent(
              text.content,
              interpreterType
            );
            
            return {
              id: text.id,
              embedding: fullEmbedding.dense,
              sparse: fullEmbedding.sparse,
              classification
            };
          })
        );

        // Update database
        for (const item of embeddings) {
          const sparseJson = item.sparse 
            ? Object.fromEntries(item.sparse)
            : null;

          const metadata_v2 = {
            ...item.classification,
            original_metadata: batch.find(t => t.id === item.id)?.metadata,
            migration_date: new Date().toISOString()
          };

          const { error: updateError } = await supabase
            .from('knowledge_base')
            .update({
              embedding_bge: item.embedding,
              sparse_embedding: sparseJson,
              metadata_v2,
              embedding_version: 'bge-m3'
            })
            .eq('id', item.id);

          if (updateError) {
            logger.error(`Failed to update ID ${item.id}:`, updateError);
            failed++;
          } else {
            processed++;
          }
        }

        logger.info(`Progress: ${processed}/${texts.length} (${failed} failed)`);
        
        // Brief pause to avoid overwhelming the system
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (error) {
        logger.error(`Batch ${i}-${i + batchSize} failed:`, error);
        failed += batch.length;
      }
    }

    // 4. Update migration status
    await supabase
      .from('embedding_migrations')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        processed_records: processed,
        failed_records: failed,
        total_records: texts?.length || 0
      })
      .eq('source_model', 'multi-qa-MiniLM-L6-cos-v1')
      .eq('target_model', 'bge-m3');

    logger.info(`BGE-M3 re-ingestion completed for ${interpreterType}!`);
    logger.info(`Total: ${texts?.length}, Processed: ${processed}, Failed: ${failed}`);

  } catch (error) {
    logger.error('Re-ingestion failed:', error);
    
    // Update migration status
    await supabase
      .from('embedding_migrations')
      .update({
        status: 'failed',
        error_log: { error: String(error) }
      })
      .eq('source_model', 'multi-qa-MiniLM-L6-cos-v1')
      .eq('target_model', 'bge-m3');
      
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  // Get interpreter type from command line args (default to 'jung')
  const interpreterType = process.argv[2] || 'jung';
  
  logger.info(`Re-ingesting ${interpreterType} texts with BGE-M3...`);
  
  reingestWithBGE(interpreterType)
    .then(() => process.exit(0))
    .catch(error => {
      logger.error('Fatal error:', error);
      process.exit(1);
    });
}