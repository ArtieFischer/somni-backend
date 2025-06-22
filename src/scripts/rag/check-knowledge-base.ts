import { createClient } from '@supabase/supabase-js';
import { config } from '../../config';
import { logger } from '../../utils/logger';

async function checkKnowledgeBase() {
  const supabase = createClient(
    config.supabase.url,
    config.supabase.serviceRoleKey
  );

  logger.info('Checking knowledge base status...\n');

  try {
    // Check total records by interpreter
    const { data: counts, error: countError } = await supabase
      .from('knowledge_base')
      .select('interpreter_type', { count: 'exact', head: true })
      .order('interpreter_type');

    if (countError) {
      logger.error('Error checking counts:', countError);
      return;
    }

    // Get counts by interpreter type
    const interpreterCounts: Record<string, number> = {};
    
    for (const interpreter of ['jung', 'freud', 'mary']) {
      const { count } = await supabase
        .from('knowledge_base')
        .select('*', { count: 'exact', head: true })
        .eq('interpreter_type', interpreter);
      
      interpreterCounts[interpreter] = count || 0;
    }

    logger.info('Knowledge Base Status:');
    logger.info('=' .repeat(40));
    Object.entries(interpreterCounts).forEach(([interpreter, count]) => {
      logger.info(`${interpreter.padEnd(10)}: ${count} records`);
    });

    // Check embedding versions
    logger.info('\nEmbedding Versions:');
    logger.info('=' .repeat(40));
    
    const { data: versions } = await supabase
      .from('knowledge_base')
      .select('embedding_version, interpreter_type')
      .limit(10);

    const versionCounts: Record<string, number> = {};
    if (versions) {
      versions.forEach(v => {
        const version = v.embedding_version || 'none';
        versionCounts[version] = (versionCounts[version] || 0) + 1;
      });
    }

    Object.entries(versionCounts).forEach(([version, count]) => {
      logger.info(`${version.padEnd(20)}: ${count} records`);
    });

    // Check if BGE embeddings exist
    const { count: bgeCount } = await supabase
      .from('knowledge_base')
      .select('*', { count: 'exact', head: true })
      .not('embedding_bge', 'is', null);

    logger.info(`\nBGE-M3 embeddings: ${bgeCount || 0} records`);

    // Sample a Jung record
    const { data: sample } = await supabase
      .from('knowledge_base')
      .select('id, source, chapter, content_type, embedding_version')
      .eq('interpreter_type', 'jung')
      .limit(3);

    if (sample && sample.length > 0) {
      logger.info('\nSample Jung records:');
      logger.info('=' .repeat(60));
      sample.forEach(s => {
        logger.info(`ID: ${s.id}`);
        logger.info(`Source: ${s.source}`);
        logger.info(`Chapter: ${s.chapter?.substring(0, 50)}...`);
        logger.info(`Type: ${s.content_type}`);
        logger.info(`Embedding Version: ${s.embedding_version || 'none'}`);
        logger.info('-'.repeat(40));
      });
    }

  } catch (error) {
    logger.error('Check failed:', error);
  }
}

// Run check
if (require.main === module) {
  checkKnowledgeBase()
    .then(() => process.exit(0))
    .catch(error => {
      logger.error('Fatal error:', error);
      process.exit(1);
    });
}