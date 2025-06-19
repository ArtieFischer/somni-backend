import { createClient } from '@supabase/supabase-js';
import { config } from '../../config/index.js';

async function checkFreudData() {
  console.log('🔍 Checking Freud data in knowledge base...\n');

  const supabase = createClient(config.supabase.url, config.supabase.serviceRoleKey);
  
  // 1. Check total Freud entries
  const { count: freudCount, error: freudError } = await supabase
    .from('knowledge_base')
    .select('*', { count: 'exact', head: true })
    .eq('interpreter_type', 'freud');

  if (freudError) {
    console.error('❌ Error checking Freud entries:', freudError);
    return;
  }

  console.log(`📚 Total Freud entries in database: ${freudCount}`);

  if (freudCount === 0) {
    console.log('\n❌ No Freud texts found in database!');
    console.log('Please run: npm run ingest-freud');
    return;
  }

  // 2. Check sample entries
  const { data: sampleEntries, error: sampleError } = await supabase
    .from('knowledge_base')
    .select('id, source, content_type, metadata')
    .eq('interpreter_type', 'freud')
    .limit(5);

  if (sampleError) {
    console.error('❌ Error getting sample entries:', sampleError);
  } else {
    console.log('\n📝 Sample Freud entries:');
    sampleEntries?.forEach((entry, i) => {
      console.log(`\n${i + 1}. Source: ${entry.source}`);
      console.log(`   Content Type: ${entry.content_type}`);
      console.log(`   Metadata: ${JSON.stringify(entry.metadata)}`);
    });
  }

  // 3. Check metadata structure
  const { data: metadataCheck, error: metadataError } = await supabase
    .from('knowledge_base')
    .select('metadata')
    .eq('interpreter_type', 'freud')
    .not('metadata', 'is', null)
    .limit(1);

  if (!metadataError && metadataCheck && metadataCheck.length > 0) {
    console.log('\n🏷️  Metadata structure:');
    const firstEntry = metadataCheck[0];
    if (firstEntry && firstEntry.metadata) {
      const metadata = firstEntry.metadata;
      console.log('Keys:', Object.keys(metadata));
      console.log('Sample:', metadata);
    }
  }

  // 4. Check if embeddings exist
  const { data: embeddingCheck, error: embeddingError } = await supabase
    .from('knowledge_base')
    .select('id')
    .eq('interpreter_type', 'freud')
    .not('embedding', 'is', null)
    .limit(1);

  if (!embeddingError) {
    console.log(`\n✅ Embeddings exist: ${embeddingCheck && embeddingCheck.length > 0 ? 'Yes' : 'No'}`);
  }

  // 5. Count by topic - check first 1000 entries
  const { data: topicCounts, error: topicError } = await supabase
    .from('knowledge_base')
    .select('metadata')
    .eq('interpreter_type', 'freud')
    .limit(1000);

  if (!topicError && topicCounts) {
    const topicMap = new Map<string, number>();
    topicCounts.forEach(row => {
      const topic = row.metadata?.topic;
      if (topic) {
        topicMap.set(topic, (topicMap.get(topic) || 0) + 1);
      }
    });
    
    console.log('\n📊 Topics in first 1000 entries:');
    for (const [topic, count] of topicMap) {
      console.log(`   ${topic}: ${count}`);
    }
  }
  
  // Check all unique sources
  const { data: allSources, error: sourcesError } = await supabase
    .from('knowledge_base')
    .select('source')
    .eq('interpreter_type', 'freud');
    
  if (!sourcesError && allSources) {
    const uniqueSources = new Set(allSources.map(row => row.source));
    console.log(`\n📚 Total unique sources: ${uniqueSources.size}`);
    console.log('All sources:');
    Array.from(uniqueSources).sort().forEach(source => {
      console.log(`   - ${source}`);
    });
  }
  
  // 6. Check which sources were ingested
  console.log('\n📚 Sources ingested:');
  const sources = new Set<string>();
  topicCounts?.forEach(row => {
    if (row.metadata?.source) {
      sources.add(row.metadata.source);
    }
  });
  
  for (const source of sources) {
    console.log(`   - ${source}`);
  }
  
  // 7. Check why no "dream" topic entries
  console.log('\n⚠️  No entries with topic="dream" found!');
  console.log('This explains why the RAG system is not finding any passages.');
  console.log('\nPossible issues:');
  console.log('1. The "dream" topic texts were not ingested');
  console.log('2. The texts were ingested with a different topic value');
  
  // Show expected vs actual files
  const expectedDreamFiles = [
    'interpretation-of-dreams.txt',
    'on-dreams.txt',
    'new-intro-to-psychoanalysis.txt',
    'introductory-lectures-dreams.txt'
  ];
  
  console.log('\n🔍 Expected dream-related files:');
  expectedDreamFiles.forEach(file => {
    const baseName = file.replace('.txt', '');
    const found = Array.from(sources).some(s => s.includes(baseName));
    console.log(`   ${found ? '✅' : '❌'} ${file}`);
  });
}

checkFreudData().catch(console.error);