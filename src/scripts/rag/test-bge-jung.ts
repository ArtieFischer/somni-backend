import { createClient } from '@supabase/supabase-js';
import { config } from '../../config';
import { bgeEmbeddingsService } from '../../services/embeddings-bge.service';
import { bgeHybridRAGService } from '../../services/hybrid-rag-bge.service';
import { logger } from '../../utils/logger';

async function testBGEWithJung() {
  const supabase = createClient(
    config.supabase.url,
    config.supabase.serviceRoleKey
  );

  logger.info('Testing BGE-M3 with a small sample of Jung texts...');

  try {
    // 1. Process just 5 Jung texts as a test
    const { data: sampleTexts, error } = await supabase
      .from('knowledge_base')
      .select('*')
      .eq('interpreter_type', 'jung')
      .limit(5);

    if (error) throw error;

    logger.info(`Processing ${sampleTexts?.length} sample texts...`);

    // 2. Generate BGE embeddings for samples
    for (const text of sampleTexts || []) {
      logger.info(`\nProcessing: ${text.source} - ${text.chapter?.substring(0, 50)}...`);
      
      const fullEmbedding = await bgeEmbeddingsService.generateFullEmbedding(
        text.content
      );
      
      logger.info(`- Dense embedding: ${fullEmbedding.dense.length} dimensions`);
      logger.info(`- Sparse embedding: ${fullEmbedding.sparse?.size || 0} tokens`);
      
      // Update in database
      const sparseJson = fullEmbedding.sparse 
        ? Object.fromEntries(fullEmbedding.sparse)
        : null;

      const { error: updateError } = await supabase
        .from('knowledge_base')
        .update({
          embedding_bge: fullEmbedding.dense,
          sparse_embedding: sparseJson,
          embedding_version: 'bge-m3-test'
        })
        .eq('id', text.id);

      if (updateError) {
        logger.error(`Failed to update ID ${text.id}:`, updateError);
      } else {
        logger.info(`✓ Updated successfully`);
      }
    }

    // 3. Test search with BGE
    logger.info('\n' + '='.repeat(60));
    logger.info('Testing BGE-M3 search...');
    logger.info('='.repeat(60));

    const testQueries = [
      "What does it mean when I dream about flying?",
      "snake symbolism in dreams",
      "mother archetype",
      "collective unconscious and personal dreams"
    ];

    for (const query of testQueries) {
      logger.info(`\nQuery: "${query}"`);
      
      // Use the diagnostic function to see different scoring methods
      await bgeHybridRAGService.diagnoseSearch(query, 'jung');
      
      // Also get actual results
      const results = await bgeHybridRAGService.searchKnowledge(query, {
        interpreterType: 'jung',
        maxResults: 3,
        adaptiveScoring: true
      });
      
      logger.info('\nTop results:');
      results.forEach((result, i) => {
        logger.info(`${i + 1}. Score: ${result.scores.hybrid.toFixed(3)}`);
        logger.info(`   Source: ${result.source}`);
        logger.info(`   Themes: ${result.matchedThemes?.join(', ') || 'none'}`);
        logger.info(`   Preview: ${result.content.substring(0, 150)}...`);
      });
    }

    // 4. Compare with old embeddings
    logger.info('\n' + '='.repeat(60));
    logger.info('Comparing embedding quality...');
    
    const testContent = sampleTexts?.[0]?.content || '';
    if (testContent) {
      // Get model info
      const bgeInfo = bgeEmbeddingsService.getModelInfo();
      logger.info('\nBGE-M3 Model Info:');
      logger.info(JSON.stringify(bgeInfo, null, 2));
    }

  } catch (error) {
    logger.error('Test failed:', error);
    throw error;
  }
}

// Run test
if (require.main === module) {
  testBGEWithJung()
    .then(() => {
      logger.info('\n✅ BGE-M3 test completed successfully!');
      process.exit(0);
    })
    .catch(error => {
      logger.error('Fatal error:', error);
      process.exit(1);
    });
}