import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function testThemeEmbeddings() {
  console.log('=== Testing Theme Embeddings ===\n');

  // 1. Check embedding coverage
  console.log('1. Checking embedding coverage...');
  const { data: stats, error: statsError } = await supabase
    .from('themes')
    .select('code, embedding')
    .limit(1000);

  if (statsError) {
    console.error('Error fetching themes:', statsError);
    return;
  }

  const totalThemes = stats.length;
  const themesWithEmbeddings = stats.filter(t => t.embedding !== null).length;
  const coverage = ((themesWithEmbeddings / totalThemes) * 100).toFixed(1);

  console.log(`Total themes: ${totalThemes}`);
  console.log(`Themes with embeddings: ${themesWithEmbeddings}`);
  console.log(`Coverage: ${coverage}%\n`);

  // 2. Test similarity between specific themes
  console.log('2. Testing theme similarity...');
  
  // Get a few themes to compare
  const themesToCompare = ['falling', 'flying', 'anxiety', 'nightmare', 'being_chased'];
  const { data: themes, error: themesError } = await supabase
    .from('themes')
    .select('code, label, embedding')
    .in('code', themesToCompare);

  if (themesError) {
    console.error('Error fetching specific themes:', themesError);
    return;
  }

  console.log('\nThemes found:');
  themes.forEach(t => {
    console.log(`- ${t.code}: ${t.label} (has embedding: ${t.embedding !== null})`);
  });

  // 3. Test the search_themes function
  console.log('\n3. Testing search_themes RPC function...');
  
  // Get embedding from 'nightmare' theme
  const nightmareTheme = themes.find(t => t.code === 'nightmare');
  if (nightmareTheme && nightmareTheme.embedding) {
    const { data: searchResults, error: searchError } = await supabase
      .rpc('search_themes', {
        query_embedding: nightmareTheme.embedding,
        similarity_threshold: 0.2,
        max_results: 5
      });

    if (searchError) {
      console.error('Error calling search_themes:', searchError);
    } else {
      console.log('\nThemes similar to "nightmare":');
      searchResults.forEach((result: any) => {
        console.log(`- ${result.code} (${result.label}): similarity ${result.score.toFixed(3)}`);
      });
    }
  }

  // 4. Show sample theme pairs with high similarity
  console.log('\n4. Finding naturally similar theme pairs...');
  
  const { data: similarities, error: simError } = await supabase.rpc('raw_sql', {
    query: `
      SELECT 
        t1.code as theme1,
        t2.code as theme2,
        1 - (t1.embedding <=> t2.embedding) as similarity
      FROM themes t1
      CROSS JOIN themes t2
      WHERE t1.code < t2.code
        AND t1.embedding IS NOT NULL
        AND t2.embedding IS NOT NULL
        AND 1 - (t1.embedding <=> t2.embedding) > 0.7
      ORDER BY similarity DESC
      LIMIT 10
    `
  }).single();

  if (!simError && similarities) {
    console.log('\nMost similar theme pairs:');
    console.log(similarities);
  }

  console.log('\n=== Test Complete ===');
}

// Run the test
testThemeEmbeddings().catch(console.error);