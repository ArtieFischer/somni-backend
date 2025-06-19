import { createClient } from '@supabase/supabase-js';
import { config } from '../../config';

/**
 * Clean neuroscience/Mary-related documents from the database
 * Use this before re-ingesting to avoid duplicates
 */
async function cleanMaryDocuments() {
  const supabase = createClient(
    config.supabase.url,
    config.supabase.serviceRoleKey
  );

  console.log('Cleaning neuroscience documents from database...');

  try {
    // Delete all Mary-related entries from knowledge_base
    const { error } = await supabase
      .from('knowledge_base')
      .delete()
      .eq('interpreter_type', 'mary');

    if (error) {
      throw error;
    }

    console.log(`✅ Successfully cleaned Mary/neuroscience entries`);

    // Verify deletion
    const { count } = await supabase
      .from('knowledge_base')
      .select('*', { count: 'exact', head: true })
      .eq('interpreter_type', 'mary');

    console.log(`Remaining Mary entries: ${count || 0}`);

  } catch (error) {
    console.error('Error cleaning documents:', error);
    process.exit(1);
  }
}

// Execute if run directly
if (require.main === module) {
  cleanMaryDocuments()
    .then(() => {
      console.log('✅ Database cleanup complete');
      process.exit(0);
    })
    .catch(error => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}