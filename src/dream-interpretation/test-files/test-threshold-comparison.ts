import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

// Test interpreters
const interpreters = [
  { id: 'lakshmi', name: 'Lakshmi' },
  { id: 'mary', name: 'Mary' }
];

// Thresholds to test
const thresholds = [0.3, 0.5];

async function testThresholdComparison() {
  console.log('=== Fragment Retrieval Threshold Comparison ===\n');

  for (const interpreter of interpreters) {
    console.log(`\n🔍 Testing interpreter: ${interpreter.name} (${interpreter.id})`);
    console.log('━'.repeat(60));

    for (const threshold of thresholds) {
      console.log(`\n📊 Threshold: ${threshold}`);
      console.log('─'.repeat(40));

      try {
        // Query fragment_themes with the current threshold
        const { data: fragments, error } = await supabase
          .from('fragment_themes')
          .select(`
            fragment_id,
            similarity_score,
            fragments!inner (
              id,
              text,
              dream_id,
              start_index,
              end_index
            )
          `)
          .eq('interpreter_id', interpreter.id)
          .gte('similarity_score', threshold)
          .order('similarity_score', { ascending: false });

        if (error) {
          console.error(`Error querying fragments:`, error);
          continue;
        }

        console.log(`\n✅ Total fragments retrieved: ${fragments?.length || 0}`);

        if (fragments && fragments.length > 0) {
          // Group by similarity score ranges
          const scoreRanges = {
            '0.9-1.0': 0,
            '0.8-0.9': 0,
            '0.7-0.8': 0,
            '0.6-0.7': 0,
            '0.5-0.6': 0,
            '0.4-0.5': 0,
            '0.3-0.4': 0,
            'below 0.3': 0
          };

          fragments.forEach(fragment => {
            const score = fragment.similarity_score;
            if (score >= 0.9) scoreRanges['0.9-1.0']++;
            else if (score >= 0.8) scoreRanges['0.8-0.9']++;
            else if (score >= 0.7) scoreRanges['0.7-0.8']++;
            else if (score >= 0.6) scoreRanges['0.6-0.7']++;
            else if (score >= 0.5) scoreRanges['0.5-0.6']++;
            else if (score >= 0.4) scoreRanges['0.4-0.5']++;
            else if (score >= 0.3) scoreRanges['0.3-0.4']++;
            else scoreRanges['below 0.3']++;
          });

          console.log('\n📈 Distribution by similarity score:');
          Object.entries(scoreRanges).forEach(([range, count]) => {
            if (count > 0) {
              console.log(`   ${range}: ${count} fragments`);
            }
          });

          // Show top 3 and bottom 3 fragments
          console.log('\n🔝 Top 3 fragments (highest similarity):');
          fragments.slice(0, 3).forEach((fragment, index) => {
            console.log(`\n   ${index + 1}. Score: ${fragment.similarity_score.toFixed(4)}`);
            console.log(`      Fragment ID: ${fragment.fragment_id}`);
            console.log(`      Dream ID: ${fragment.fragments.dream_id}`);
            console.log(`      Text: "${fragment.fragments.text.substring(0, 100)}${fragment.fragments.text.length > 100 ? '...' : ''}"`);
          });

          if (fragments.length > 3) {
            console.log('\n🔻 Bottom 3 fragments (lowest similarity above threshold):');
            fragments.slice(-3).forEach((fragment, index) => {
              console.log(`\n   ${index + 1}. Score: ${fragment.similarity_score.toFixed(4)}`);
              console.log(`      Fragment ID: ${fragment.fragment_id}`);
              console.log(`      Dream ID: ${fragment.fragments.dream_id}`);
              console.log(`      Text: "${fragment.fragments.text.substring(0, 100)}${fragment.fragments.text.length > 100 ? '...' : ''}"`);
            });
          }
        }

      } catch (error) {
        console.error(`Error during threshold test:`, error);
      }
    }
  }

  console.log('\n\n=== Summary ===\n');
  
  // Re-run queries to get summary counts
  for (const interpreter of interpreters) {
    console.log(`${interpreter.name}:`);
    for (const threshold of thresholds) {
      const { count, error } = await supabase
        .from('fragment_themes')
        .select('*', { count: 'exact', head: true })
        .eq('interpreter_id', interpreter.id)
        .gte('similarity_score', threshold);
      
      if (!error) {
        console.log(`  - Threshold ${threshold}: ${count} fragments`);
      }
    }
    console.log('');
  }
}

// Run the test
testThresholdComparison()
  .then(() => {
    console.log('\n✨ Test completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  });