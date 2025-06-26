require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client with service role key
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase configuration. Please check your .env file.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function checkFragmentThemesData() {
  try {
    // 1. Get total count of rows in fragment_themes table
    const { count, error: countError } = await supabase
      .from('fragment_themes')
      .select('*', { count: 'exact', head: true });
    
    if (countError) {
      console.error('Error getting count:', countError);
      return;
    }
    
    console.log('\n=== FRAGMENT THEMES TABLE STATISTICS ===');
    console.log(`Total rows in fragment_themes: ${count}`);
    
    // 2. Get a sample of 10 rows to see the data structure
    const { data: sampleData, error: sampleError } = await supabase
      .from('fragment_themes')
      .select('*')
      .limit(10);
    
    if (sampleError) {
      console.error('Error getting sample data:', sampleError);
      return;
    }
    
    console.log('\n=== SAMPLE DATA (10 rows) ===');
    console.log(JSON.stringify(sampleData, null, 2));
    
    // 3. Check for specific test themes
    const testThemes = ['home', 'ocean', 'mother', 'glass', 'water'];
    
    console.log('\n=== TEST THEMES ANALYSIS ===');
    
    for (const theme of testThemes) {
      // Count how many fragments are associated with this theme
      const { count: themeCount, error: themeError } = await supabase
        .from('fragment_themes')
        .select('*', { count: 'exact', head: true })
        .eq('theme_code', theme);
      
      if (themeError) {
        console.error(`Error counting theme ${theme}:`, themeError);
        continue;
      }
      
      // Get top 3 fragments for this theme (highest similarity)
      const { data: topFragments, error: fragmentError } = await supabase
        .from('fragment_themes')
        .select(`
          fragment_id,
          similarity
        `)
        .eq('theme_code', theme)
        .order('similarity', { ascending: false })
        .limit(3);
      
      if (fragmentError) {
        console.error(`Error getting fragments for theme ${theme}:`, fragmentError);
        continue;
      }
      
      console.log(`\nTheme: "${theme}"`);
      console.log(`  Total fragments: ${themeCount}`);
      
      if (topFragments && topFragments.length > 0) {
        console.log('  Top fragments:');
        topFragments.forEach((item, index) => {
          console.log(`    ${index + 1}. Similarity: ${item.similarity.toFixed(4)}`);
          console.log(`       Fragment ID: ${item.fragment_id}`);
        });
      } else {
        console.log('  No fragments found for this theme');
      }
    }
    
    // 4. Check similarity score distribution
    const { data: similarityStats, error: statsError } = await supabase
      .from('fragment_themes')
      .select('similarity')
      .order('similarity', { ascending: false })
      .limit(1000); // Limit to avoid fetching too much data
    
    if (statsError) {
      console.error('Error getting similarity stats:', statsError);
      return;
    }
    
    if (similarityStats && similarityStats.length > 0) {
      const similarities = similarityStats.map(s => s.similarity);
      const maxSim = Math.max(...similarities);
      const minSim = Math.min(...similarities);
      const avgSim = similarities.reduce((a, b) => a + b, 0) / similarities.length;
      
      console.log('\n=== SIMILARITY SCORE STATISTICS (top 1000) ===');
      console.log(`Max similarity: ${maxSim.toFixed(4)}`);
      console.log(`Min similarity: ${minSim.toFixed(4)}`);
      console.log(`Average similarity: ${avgSim.toFixed(4)}`);
      
      // Distribution buckets
      const buckets = {
        '0.9-1.0': 0,
        '0.8-0.9': 0,
        '0.7-0.8': 0,
        '0.6-0.7': 0,
        '0.5-0.6': 0,
        '< 0.5': 0
      };
      
      similarities.forEach(sim => {
        if (sim >= 0.9) buckets['0.9-1.0']++;
        else if (sim >= 0.8) buckets['0.8-0.9']++;
        else if (sim >= 0.7) buckets['0.7-0.8']++;
        else if (sim >= 0.6) buckets['0.6-0.7']++;
        else if (sim >= 0.5) buckets['0.5-0.6']++;
        else buckets['< 0.5']++;
      });
      
      console.log('\nSimilarity distribution:');
      Object.entries(buckets).forEach(([range, count]) => {
        const percentage = (count / similarities.length * 100).toFixed(1);
        console.log(`  ${range}: ${count} (${percentage}%)`);
      });
    }
    
  } catch (error) {
    console.error('Unexpected error:', error);
  } finally {
    process.exit(0);
  }
}

// Run the check
console.log('Starting fragment_themes data analysis...');
checkFragmentThemesData();