import { createClient } from '@supabase/supabase-js';
import { config } from '../../config';
import { logger } from '../../utils/logger';

async function clearJungData() {
  const supabase = createClient(
    config.supabase.url,
    config.supabase.serviceRoleKey
  );

  logger.info('🧹 Clearing Jung data from knowledge base...');

  try {
    // Get count first
    const { count } = await supabase
      .from('knowledge_base')
      .select('*', { count: 'exact', head: true })
      .eq('interpreter_type', 'jung');

    logger.info(`Found ${count || 0} Jung records to delete`);

    if (count && count > 0) {
      // Delete in batches
      const batchSize = 1000;
      let deleted = 0;

      while (deleted < count) {
        const { error, data } = await supabase
          .from('knowledge_base')
          .delete()
          .eq('interpreter_type', 'jung')
          .select('id')
          .limit(batchSize);

        if (error) {
          logger.error('Error deleting batch:', error);
          break;
        }

        deleted += data?.length || 0;
        logger.info(`Deleted ${deleted}/${count} records...`);
      }

      logger.info('✅ Jung data cleared successfully');
    } else {
      logger.info('No Jung data found to clear');
    }

    // Verify deletion
    const { count: remainingCount } = await supabase
      .from('knowledge_base')
      .select('*', { count: 'exact', head: true })
      .eq('interpreter_type', 'jung');

    if (remainingCount && remainingCount > 0) {
      logger.warn(`⚠️  ${remainingCount} Jung records still remain`);
    }

  } catch (error) {
    logger.error('Failed to clear Jung data:', error);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  clearJungData()
    .then(() => {
      logger.info('Ready to re-ingest with enhanced classification');
      process.exit(0);
    })
    .catch(error => {
      logger.error('Fatal error:', error);
      process.exit(1);
    });
}