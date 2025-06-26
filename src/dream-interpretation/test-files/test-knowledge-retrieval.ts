/**
 * Test knowledge retrieval for each interpreter
 */

import { createClient } from '@supabase/supabase-js';
import { config } from '../../config';

const supabase = createClient(
  config.supabase.url,
  config.supabase.serviceRoleKey
);

async function testKnowledgeRetrieval() {
  console.log('🔍 Testing Knowledge Retrieval for All Interpreters\n');
  
  // Check fragment counts by interpreter
  console.log('📊 Fragment counts by interpreter:');
  
  const interpreters = ['jung', 'lakshmi', 'freud', 'mary'];
  for (const interpreter of interpreters) {
    const { count, error } = await supabase
      .from('knowledge_fragments')
      .select('*', { count: 'exact', head: true })
      .eq('interpreter', interpreter);
      
    console.log(`${interpreter}: ${count || 0} fragments`);
  }
  
  // Check fragment-theme associations for each interpreter
  console.log('\n📊 Fragment-theme associations by interpreter:');
  
  for (const interpreter of interpreters) {
    // Get fragments for this interpreter
    const { data: fragments } = await supabase
      .from('knowledge_fragments')
      .select('id')
      .eq('interpreter', interpreter)
      .limit(10);
      
    if (!fragments || fragments.length === 0) {
      console.log(`\n${interpreter.toUpperCase()}: No fragments found`);
      continue;
    }
    
    // Check theme associations
    const fragmentIds = fragments.map(f => f.id);
    const { data: themeAssocs, error: themeError } = await supabase
      .from('fragment_themes')
      .select('fragment_id, theme_code, similarity')
      .in('fragment_id', fragmentIds)
      .gte('similarity', 0.5)
      .order('similarity', { ascending: false })
      .limit(5);
      
    console.log(`\n${interpreter.toUpperCase()}:`);
    console.log(`  - Fragments in DB: ${fragments.length}+`);
    console.log(`  - Theme associations (>= 0.5): ${themeAssocs?.length || 0}`);
    
    if (themeAssocs && themeAssocs.length > 0) {
      console.log('  - Sample associations:');
      themeAssocs.slice(0, 3).forEach(ta => {
        console.log(`    * Theme: ${ta.theme_code}, Similarity: ${ta.similarity.toFixed(3)}`);
      });
    }
  }
  
  // Test specific themes
  console.log('\n\n📊 Testing specific themes from the dream:');
  const testThemes = ['home', 'ocean', 'mother', 'water', 'door'];
  
  for (const theme of testThemes) {
    console.log(`\nTheme "${theme}":`);
    
    // Check associations for each interpreter
    for (const interpreter of interpreters) {
      // First get fragment IDs for this interpreter
      const { data: fragments } = await supabase
        .from('knowledge_fragments')
        .select('id')
        .eq('interpreter', interpreter);
      
      if (!fragments || fragments.length === 0) continue;
      
      const fragmentIds = fragments.map(f => f.id);
      
      // Then check associations for these fragments
      const { data: associations } = await supabase
        .from('fragment_themes')
        .select('fragment_id, similarity')
        .eq('theme_code', theme)
        .in('fragment_id', fragmentIds)
        .gte('similarity', 0.5)
        .order('similarity', { ascending: false })
        .limit(3);
        
      console.log(`  ${interpreter}: ${associations?.length || 0} associations`);
    }
  }
}

// Run test
testKnowledgeRetrieval().catch(console.error);