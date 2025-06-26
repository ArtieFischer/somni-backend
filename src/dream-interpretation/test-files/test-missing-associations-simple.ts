/**
 * Check if lakshmi and mary fragments have any theme associations
 */

import { createClient } from '@supabase/supabase-js';
import { config } from '../../config';

const supabase = createClient(
  config.supabase.url,
  config.supabase.serviceRoleKey
);

async function checkMissingAssociations() {
  console.log('🔍 Checking theme associations for lakshmi and mary fragments\n');
  
  const interpreters = ['lakshmi', 'mary'];
  
  for (const interpreter of interpreters) {
    console.log(`\n=== ${interpreter.toUpperCase()} ===`);
    
    // Get some fragment IDs for this interpreter
    const { data: fragments, error: fragError } = await supabase
      .from('knowledge_fragments')
      .select('id')
      .eq('interpreter', interpreter)
      .limit(100);
      
    if (fragError || !fragments) {
      console.log(`Error getting fragments: ${fragError?.message}`);
      continue;
    }
    
    console.log(`Found ${fragments.length} fragments (sampled)`);
    
    const fragmentIds = fragments.map(f => f.id);
    
    // Check if any of these fragments have theme associations
    const { data: associations, error: assocError } = await supabase
      .from('fragment_themes')
      .select('fragment_id, theme_code, similarity')
      .in('fragment_id', fragmentIds)
      .order('similarity', { ascending: false })
      .limit(20);
      
    if (assocError) {
      console.log(`Error checking associations: ${assocError.message}`);
      continue;
    }
    
    if (!associations || associations.length === 0) {
      console.log(`❌ NO theme associations found for any of the sampled fragments`);
      console.log(`Sample fragment IDs that lack associations:`);
      fragmentIds.slice(0, 5).forEach(id => {
        console.log(`  - ${id}`);
      });
    } else {
      console.log(`✅ Found ${associations.length} theme associations`);
      console.log(`\nTop 5 associations:`);
      associations.slice(0, 5).forEach((assoc, idx) => {
        console.log(`  ${idx + 1}. Theme: "${assoc.theme_code}" | Similarity: ${assoc.similarity.toFixed(3)}`);
        console.log(`     Fragment: ${assoc.fragment_id.substring(0, 8)}...`);
      });
      
      // Count unique fragments with associations
      const uniqueFragments = new Set(associations.map(a => a.fragment_id));
      console.log(`\nUnique fragments with associations: ${uniqueFragments.size} out of ${fragmentIds.length} sampled`);
    }
  }
  
  // Now let's check if ANY lakshmi/mary fragments have associations
  console.log('\n\n=== CHECKING ALL FRAGMENTS ===');
  
  for (const interpreter of interpreters) {
    // Get total count of fragments
    const { count: totalCount } = await supabase
      .from('knowledge_fragments')
      .select('*', { count: 'exact', head: true })
      .eq('interpreter', interpreter);
      
    console.log(`\n${interpreter.toUpperCase()}: ${totalCount} total fragments`);
    
    // Check if any fragment from this interpreter has associations
    // We'll do this by getting a sample of associations and checking their interpreters
    const { data: sampleAssocs } = await supabase
      .from('fragment_themes')
      .select(`
        fragment_id,
        theme_code,
        similarity,
        knowledge_fragments!inner(interpreter)
      `)
      .eq('knowledge_fragments.interpreter', interpreter)
      .limit(10);
      
    if (sampleAssocs && sampleAssocs.length > 0) {
      console.log(`✅ Found associations for ${interpreter} fragments`);
      console.log(`Sample associations:`);
      sampleAssocs.slice(0, 3).forEach(assoc => {
        console.log(`  - Theme: "${assoc.theme_code}" | Similarity: ${assoc.similarity.toFixed(3)}`);
      });
    } else {
      console.log(`❌ NO associations found for ANY ${interpreter} fragments`);
      console.log(`This means fragments were never processed for theme embeddings`);
    }
  }
}

// Run test
checkMissingAssociations().catch(console.error);