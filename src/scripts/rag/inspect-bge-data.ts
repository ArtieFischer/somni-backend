import { createClient } from '@supabase/supabase-js';
import { config } from '../../config';
import { logger } from '../../utils/logger';

async function inspectBGEData() {
  const supabase = createClient(
    config.supabase.url,
    config.supabase.serviceRoleKey
  );

  logger.info('🔍 Inspecting BGE-M3 data quality...\n');

  try {
    // 1. Check overall statistics
    const { count: totalCount } = await supabase
      .from('knowledge_base')
      .select('*', { count: 'exact', head: true })
      .eq('interpreter_type', 'jung')
      .eq('embedding_version', 'bge-m3');

    logger.info(`Total BGE-M3 Jung records: ${totalCount || 0}`);

    // 2. Sample some records to inspect
    const { data: samples, error } = await supabase
      .from('knowledge_base')
      .select('id, source, chapter, content_type, metadata_v2, content')
      .eq('interpreter_type', 'jung')
      .eq('embedding_version', 'bge-m3')
      .limit(10);

    if (error) {
      logger.error('Error fetching samples:', error);
      return;
    }

    logger.info(`\nSampling ${samples?.length || 0} records:\n`);

    samples?.forEach((sample, i) => {
      logger.info(`\n${'='.repeat(60)}`);
      logger.info(`Record ${i + 1} (ID: ${sample.id})`);
      logger.info(`${'='.repeat(60)}`);
      logger.info(`Source: ${sample.source}`);
      logger.info(`Chapter: ${sample.chapter || 'None'}`);
      logger.info(`Content Type: ${sample.content_type}`);
      
      // Inspect metadata_v2
      if (sample.metadata_v2) {
        logger.info('\nMetadata V2:');
        logger.info(`- Primary Type: ${sample.metadata_v2.primary_type}`);
        logger.info(`- Confidence: ${JSON.stringify(sample.metadata_v2.confidence)}`);
        logger.info(`- Themes: ${sample.metadata_v2.applicable_themes?.join(', ') || 'None'}`);
        logger.info(`- Concepts: ${sample.metadata_v2.jungian_concepts?.join(', ') || 'None'}`);
        logger.info(`- Symbols: ${sample.metadata_v2.symbols_present?.join(', ') || 'None'}`);
        logger.info(`- Word Count: ${sample.metadata_v2.word_count}`);
        logger.info(`- Has Sparse: ${sample.metadata_v2.has_sparse}`);
      } else {
        logger.info('\n❌ No metadata_v2 found!');
      }
      
      logger.info(`\nContent Preview: "${sample.content.substring(0, 200)}..."`);
    });

    // 3. Check theme distribution
    logger.info(`\n\n${'='.repeat(60)}`);
    logger.info('THEME ANALYSIS');
    logger.info(`${'='.repeat(60)}`);

    const { data: themeData } = await supabase
      .from('knowledge_base')
      .select('metadata_v2')
      .eq('interpreter_type', 'jung')
      .eq('embedding_version', 'bge-m3')
      .not('metadata_v2', 'is', null)
      .limit(100);

    const themeCount: Record<string, number> = {};
    themeData?.forEach(record => {
      const themes = record.metadata_v2?.applicable_themes || [];
      themes.forEach((theme: string) => {
        themeCount[theme] = (themeCount[theme] || 0) + 1;
      });
    });

    logger.info('\nTop themes found:');
    Object.entries(themeCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .forEach(([theme, count]) => {
        logger.info(`- ${theme}: ${count} occurrences`);
      });

    // 4. Check chapter detection
    logger.info(`\n\n${'='.repeat(60)}`);
    logger.info('CHAPTER ANALYSIS');
    logger.info(`${'='.repeat(60)}`);

    const { data: chapterData } = await supabase
      .from('knowledge_base')
      .select('chapter, source')
      .eq('interpreter_type', 'jung')
      .eq('embedding_version', 'bge-m3')
      .not('chapter', 'is', null)
      .limit(50);

    logger.info('\nSample chapters detected:');
    chapterData?.slice(0, 20).forEach(record => {
      logger.info(`- ${record.source}: "${record.chapter}"`);
    });

    // 5. Check for issues
    logger.info(`\n\n${'='.repeat(60)}`);
    logger.info('POTENTIAL ISSUES');
    logger.info(`${'='.repeat(60)}`);

    // Records without themes
    const { count: noThemes } = await supabase
      .from('knowledge_base')
      .select('*', { count: 'exact', head: true })
      .eq('interpreter_type', 'jung')
      .eq('embedding_version', 'bge-m3')
      .or('metadata_v2.applicable_themes.is.null,metadata_v2.applicable_themes.eq.{}');

    logger.info(`\nRecords without themes: ${noThemes || 0}`);

    // Records with weird chapters
    const { data: weirdChapters } = await supabase
      .from('knowledge_base')
      .select('chapter')
      .eq('interpreter_type', 'jung')
      .eq('embedding_version', 'bge-m3')
      .not('chapter', 'is', null)
      .limit(200);

    const suspiciousChapters = weirdChapters?.filter(r => 
      r.chapter.length > 100 || 
      r.chapter.split('\n').length > 1 ||
      !isNaN(Number(r.chapter))
    );

    logger.info(`Suspicious chapters: ${suspiciousChapters?.length || 0}`);
    if (suspiciousChapters && suspiciousChapters.length > 0) {
      logger.info('Examples:');
      suspiciousChapters.slice(0, 5).forEach(r => {
        logger.info(`- "${r.chapter.substring(0, 50)}..."`);
      });
    }

  } catch (error) {
    logger.error('Inspection failed:', error);
  }
}

// Run inspection
if (require.main === module) {
  inspectBGEData()
    .then(() => {
      logger.info('\n✅ Inspection complete');
      process.exit(0);
    })
    .catch(error => {
      logger.error('Fatal error:', error);
      process.exit(1);
    });
}