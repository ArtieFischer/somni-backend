import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://tqwlnrlvtdsqgqpuryne.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRxd2xucmx2dGRzcWdxcHVyeW5lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkyMTIzMDksImV4cCI6MjA2NDc4ODMwOX0.h7Kc-NREKkRNPsXcwClUAtQ7pDbu2BFym231q3gT5jQ';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testThemes() {
  console.log('1. Checking themes in database...\n');
  
  // Get theme count
  const { count, error: countError } = await supabase
    .from('themes')
    .select('*', { count: 'exact', head: true });
    
  if (countError) {
    console.error('Error counting themes:', countError);
    return;
  }
  
  console.log(`Total themes in database: ${count}`);
  
  // Get a sample of themes
  const { data: themes, error: themesError } = await supabase
    .from('themes')
    .select('code, label, embedding')
    .limit(5);
    
  if (themesError) {
    console.error('Error fetching themes:', themesError);
    return;
  }
  
  console.log('\nSample themes:');
  themes?.forEach(theme => {
    const hasEmbedding = theme.embedding && theme.embedding.length > 0;
    console.log(`- ${theme.code}: ${theme.label} (embedding: ${hasEmbedding ? `yes, ${theme.embedding.length} dims` : 'no'})`);
  });
  
  // Test similarity search if we have embeddings
  const themeWithEmbedding = themes?.find(t => t.embedding && t.embedding.length > 0);
  
  if (themeWithEmbedding) {
    console.log(`\n2. Testing similarity search with theme "${themeWithEmbedding.label}"...\n`);
    
    const { data: similarThemes, error: searchError } = await supabase
      .rpc('search_themes', {
        query_embedding: themeWithEmbedding.embedding,
        similarity_threshold: 0.5,
        max_results: 5
      });
      
    if (searchError) {
      console.error('Error searching themes:', searchError);
    } else {
      console.log('Similar themes:');
      similarThemes?.forEach((theme: any) => {
        console.log(`- ${theme.label} (similarity: ${theme.score.toFixed(3)})`);
      });
    }
  } else {
    console.log('\n⚠️  No themes have embeddings yet. Run the embedding generation script.');
  }
}

testThemes().catch(console.error);