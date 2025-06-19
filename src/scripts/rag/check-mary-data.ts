import { createClient } from '@supabase/supabase-js';
import { config } from '../../config';

/**
 * Check what neuroscience/Mary documents are in the database
 */
async function checkMaryData() {
  const supabase = createClient(
    config.supabase.url,
    config.supabase.serviceRoleKey
  );

  console.log('Checking neuroscience documents in database...\n');

  try {
    // Get count of neuroscience documents
    const { count: totalCount } = await supabase
      .from('documents')
      .select('*', { count: 'exact', head: true })
      .eq('metadata->>topic', 'neuroscience');

    console.log(`Total neuroscience documents: ${totalCount || 0}`);

    // Get breakdown by source
    const { data: sources, error: sourceError } = await supabase
      .from('documents')
      .select('metadata')
      .eq('metadata->>topic', 'neuroscience');

    if (sourceError) throw sourceError;

    // Count by source
    const sourceCounts = new Map<string, number>();
    const subtopicCounts = new Map<string, number>();

    sources?.forEach(doc => {
      const source = doc.metadata?.source || 'Unknown';
      sourceCounts.set(source, (sourceCounts.get(source) || 0) + 1);

      // Count subtopics
      const subtopics = doc.metadata?.subtopic || [];
      subtopics.forEach((subtopic: string) => {
        subtopicCounts.set(subtopic, (subtopicCounts.get(subtopic) || 0) + 1);
      });
    });

    console.log('\nDocuments by source:');
    console.log('-'.repeat(50));
    Array.from(sourceCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .forEach(([source, count]) => {
        console.log(`${source}: ${count} chunks`);
      });

    console.log('\nTop subtopics:');
    console.log('-'.repeat(50));
    Array.from(subtopicCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .forEach(([subtopic, count]) => {
        console.log(`${subtopic}: ${count} occurrences`);
      });

    // Sample a few documents
    console.log('\nSample documents:');
    console.log('-'.repeat(50));
    
    const { data: samples } = await supabase
      .from('documents')
      .select('content, metadata')
      .eq('metadata->>topic', 'neuroscience')
      .limit(3);

    samples?.forEach((doc, idx) => {
      console.log(`\n[${idx + 1}] Source: ${doc.metadata?.source || 'Unknown'}`);
      console.log(`Subtopics: ${doc.metadata?.subtopic?.join(', ') || 'None'}`);
      console.log(`Content preview: "${doc.content.substring(0, 150)}..."`);
    });

  } catch (error) {
    console.error('Error checking data:', error);
  }
}

// Execute if run directly
if (require.main === module) {
  checkMaryData()
    .then(() => {
      console.log('\n✅ Data check complete');
      process.exit(0);
    })
    .catch(error => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}