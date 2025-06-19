const { createClient } = require('@supabase/supabase-js');
const { config } = require('./dist/config');

async function testChunkQuality() {
  const supabase = createClient(
    config.supabase.url,
    config.supabase.serviceRoleKey
  );

  console.log('Testing chunk quality for Mary entries...\n');

  // Get a sample of Mary chunks
  const { data: chunks, error } = await supabase
    .from('knowledge_base')
    .select('content, source')
    .eq('interpreter_type', 'mary')
    .limit(10);

  if (error) {
    console.error('Error fetching chunks:', error);
    return;
  }

  console.log(`Found ${chunks.length} sample chunks\n`);

  // Check each chunk for mid-sentence cuts
  chunks.forEach((chunk, index) => {
    console.log(`\n--- Chunk ${index + 1} from ${chunk.source} ---`);
    console.log('Start:', chunk.content.substring(0, 100) + '...');
    console.log('End:', '...' + chunk.content.substring(chunk.content.length - 100));
    
    // Check if it starts with lowercase (likely mid-sentence)
    const startsWithLowercase = /^[a-z]/.test(chunk.content.trim());
    // Check if it ends properly (with punctuation)
    const endsProperlyFromPage = /[.!?]\s*$/.test(chunk.content.trim());
    
    console.log(`Starts mid-sentence: ${startsWithLowercase ? 'YES ❌' : 'NO ✅'}`);
    console.log(`Ends properly: ${endsProperlyFromPage ? 'YES ✅' : 'NO ❌'}`);
  });
}

testChunkQuality().catch(console.error);