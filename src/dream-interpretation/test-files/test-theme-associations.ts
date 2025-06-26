/**
 * Test theme associations in fragment_themes table
 */

import { createClient } from '@supabase/supabase-js';
import { config } from '../../config';

const supabase = createClient(
  config.supabase.url,
  config.supabase.serviceRoleKey
);

async function testThemeAssociations() {
  console.log('🔍 Testing theme associations in fragment_themes table\n');
  
  // First, check if there are ANY associations at all
  const { count: totalCount } = await supabase
    .from('fragment_themes')
    .select('*', { count: 'exact', head: true });
    
  console.log(`Total associations in fragment_themes table: ${totalCount || 0}\n`);
  
  if (!totalCount || totalCount === 0) {
    console.log('❌ No theme associations found in the database!');
    console.log('The fragment_themes table is empty. Theme-based knowledge retrieval will not work.');
    console.log('\nYou need to run the theme embedding process to populate this table.');
    return;
  }
  
  // Check associations by similarity threshold
  console.log('Associations by similarity threshold:');
  const thresholds = [0.7, 0.6, 0.5, 0.4, 0.3];
  
  for (const threshold of thresholds) {
    const { count } = await supabase
      .from('fragment_themes')
      .select('*', { count: 'exact', head: true })
      .gte('similarity', threshold);
      
    console.log(`  >= ${threshold}: ${count || 0} associations`);
  }
  
  // Get sample associations
  console.log('\nSample associations:');
  const { data: samples } = await supabase
    .from('fragment_themes')
    .select('fragment_id, theme_code, similarity')
    .order('similarity', { ascending: false })
    .limit(10);
    
  if (samples && samples.length > 0) {
    samples.forEach(s => {
      console.log(`  Fragment ${s.fragment_id.substring(0, 8)}... → Theme "${s.theme_code}" (similarity: ${s.similarity.toFixed(3)})`);
    });
  }
  
  // Check which interpreters have fragments with associations
  console.log('\n\nChecking which interpreters have associated fragments:');
  
  const interpreters = ['jung', 'lakshmi', 'freud', 'mary'];
  
  for (const interpreter of interpreters) {
    // Get all fragment IDs for this interpreter (no limit)
    const { data: fragments } = await supabase
      .from('knowledge_fragments')
      .select('id')
      .eq('interpreter', interpreter);
      
    if (!fragments || fragments.length === 0) {
      console.log(`\n${interpreter}: No fragments`);
      continue;
    }
    
    // Check how many have associations
    const fragmentIds = fragments.map(f => f.id);
    
    // Need to check in batches due to query limits
    let associatedCount = 0;
    const batchSize = 100;
    
    for (let i = 0; i < fragmentIds.length; i += batchSize) {
      const batch = fragmentIds.slice(i, i + batchSize);
      const { count } = await supabase
        .from('fragment_themes')
        .select('fragment_id', { count: 'exact', head: true })
        .in('fragment_id', batch);
        
      associatedCount += (count || 0);
    }
    
    console.log(`\n${interpreter}: ${fragments.length} fragments total, ${associatedCount} have theme associations`);
  }
}

// Run test
testThemeAssociations().catch(console.error);