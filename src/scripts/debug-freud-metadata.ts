import { createClient } from '@supabase/supabase-js';
import { config } from '../config/index.js';

async function debugFreudMetadata() {
  console.log('🔍 Debugging Freud metadata structure...\n');

  const supabase = createClient(config.supabase.url, config.supabase.serviceRoleKey);
  
  // Get sample entries from each expected dream source
  const dreamSources = [
    'interpretation-of-dreams',
    'on-dreams',
    'new-intro-to-psychoanalysis',
    'introductory-lectures-dreams'
  ];
  
  for (const source of dreamSources) {
    console.log(`\n📚 Checking source: ${source}`);
    
    const { data, error } = await supabase
      .from('knowledge_base')
      .select('id, metadata')
      .eq('interpreter_type', 'freud')
      .eq('source', source)
      .limit(2);
      
    if (error) {
      console.error(`   Error: ${error.message}`);
      continue;
    }
    
    if (!data || data.length === 0) {
      console.log(`   ❌ No entries found`);
      continue;
    }
    
    console.log(`   ✅ Found ${data.length} entries`);
    console.log(`   Sample metadata:`, JSON.stringify(data[0]?.metadata, null, 2));
    
    // Check if topic is in the metadata
    const topic = data[0]?.metadata?.topic;
    console.log(`   Topic value: "${topic}" (type: ${typeof topic})`);
  }
  
  // Try to find ANY entry with topic='dream' using raw SQL
  console.log('\n🔍 Searching for ANY entry with topic="dream" in metadata...');
  const { data: dreamData, error: dreamError } = await supabase
    .from('knowledge_base')
    .select('source, metadata')
    .eq('interpreter_type', 'freud')
    .limit(100);
    
  if (!dreamError && dreamData) {
    const dreamEntries = dreamData.filter(d => 
      d.metadata && d.metadata.topic === 'dream'
    );
    console.log(`Found ${dreamEntries.length} entries with topic="dream"`);
    if (dreamEntries.length > 0) {
      console.log('First dream entry:', dreamEntries[0]);
    }
  }
}

debugFreudMetadata().catch(console.error);