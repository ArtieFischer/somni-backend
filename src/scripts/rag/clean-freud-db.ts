#!/usr/bin/env node

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { config } from '../../config';

/**
 * Clean Freud entries from database before re-ingestion
 */

async function cleanFreudDatabase() {
  const supabase = createClient(
    config.supabase.url,
    config.supabase.serviceRoleKey
  );

  console.log('🗑️  Cleaning Freud entries from database...\n');

  try {
    // First, get count of existing entries
    const { count: beforeCount } = await supabase
      .from('knowledge_base')
      .select('*', { count: 'exact', head: true })
      .eq('interpreter_type', 'freud');

    console.log(`📊 Current Freud entries: ${beforeCount || 0}`);

    if (beforeCount && beforeCount > 0) {
      // Show breakdown by source
      const { data: sources } = await supabase
        .from('knowledge_base')
        .select('source')
        .eq('interpreter_type', 'freud');

      if (sources) {
        const sourceCounts = sources.reduce((acc: Record<string, number>, item) => {
          acc[item.source] = (acc[item.source] || 0) + 1;
          return acc;
        }, {});

        console.log('\n📚 Breakdown by source:');
        Object.entries(sourceCounts)
          .sort(([, a], [, b]) => b - a)
          .forEach(([source, count]) => {
            console.log(`   ${source}: ${count} chunks`);
          });
      }

      // Confirm deletion
      console.log('\n⚠️  This will DELETE all Freud entries from the database.');
      console.log('   Press Ctrl+C to cancel, or wait 5 seconds to continue...');
      
      await new Promise(resolve => setTimeout(resolve, 5000));

      // Delete all Freud entries
      console.log('\n🔥 Deleting all Freud entries...');
      const { error: deleteError } = await supabase
        .from('knowledge_base')
        .delete()
        .eq('interpreter_type', 'freud');
        
      // Get count of deleted entries separately
      const deletedCount = beforeCount;

      if (deleteError) {
        console.error('❌ Error deleting entries:', deleteError);
        throw deleteError;
      }

      console.log(`✅ Successfully deleted ${deletedCount || 0} entries`);

      // Verify deletion
      const { count: afterCount } = await supabase
        .from('knowledge_base')
        .select('*', { count: 'exact', head: true })
        .eq('interpreter_type', 'freud');

      console.log(`\n📊 Remaining Freud entries: ${afterCount || 0}`);

      // Compare with Jung for reference
      const { count: jungCount } = await supabase
        .from('knowledge_base')
        .select('*', { count: 'exact', head: true })
        .eq('interpreter_type', 'jung');

      console.log(`📊 Jung entries (for reference): ${jungCount || 0}`);
      
      console.log('\n✅ Database cleaned! Ready for new ingestion.');
      console.log('\n📝 Next steps:');
      console.log('1. Run: npm run ingest-freud-improved /path/to/freud/texts');
      console.log('2. Expected result: ~2,000-3,000 passages (similar to Jung)');
      
    } else {
      console.log('✅ No Freud entries found. Database is already clean.');
    }

  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }
}

// Run the cleanup
if (require.main === module) {
  cleanFreudDatabase()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('❌ Script failed:', error);
      process.exit(1);
    });
}