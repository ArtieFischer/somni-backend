/**
 * Debug the retrieval process to see what's happening
 */

import { createClient } from '@supabase/supabase-js';
import { config } from '../../config';

const supabase = createClient(
  config.supabase.url,
  config.supabase.serviceRoleKey
);

async function debugRetrieval() {
  console.log('🔍 Debugging retrieval for lakshmi and mary\n');
  
  const testThemes = ['home', 'ocean', 'mother', 'glass', 'water'];
  const interpreters = ['lakshmi', 'mary'] as const;
  
  for (const interpreter of interpreters) {
    console.log(`\n=== ${interpreter.toUpperCase()} ===`);
    
    // Step 1: Get fragment-theme associations
    const { data: fragmentThemes, error: ftError } = await supabase
      .from('fragment_themes')
      .select('fragment_id, theme_code, similarity')
      .in('theme_code', testThemes)
      .gte('similarity', 0.3)
      .order('similarity', { ascending: false })
      .limit(200);
      
    if (ftError) {
      console.log('Error getting fragment themes:', ftError);
      continue;
    }
    
    console.log(`Found ${fragmentThemes?.length || 0} fragment-theme associations`);
    
    if (!fragmentThemes || fragmentThemes.length === 0) continue;
    
    // Group by fragment and calculate scores
    const fragmentScores = new Map<string, {
      themes: string[];
      maxSim: number;
      avgSim: number;
    }>();

    fragmentThemes.forEach(ft => {
      const existing = fragmentScores.get(ft.fragment_id) || {
        themes: [],
        maxSim: 0,
        avgSim: 0
      };
      existing.themes.push(ft.theme_code);
      existing.maxSim = Math.max(existing.maxSim, ft.similarity);
      fragmentScores.set(ft.fragment_id, existing);
    });
    
    console.log(`Unique fragments: ${fragmentScores.size}`);
    
    // Get top 20 fragments
    const topFragmentIds = Array.from(fragmentScores.entries())
      .sort((a, b) => b[1].maxSim - a[1].maxSim)
      .slice(0, 20)
      .map(([id]) => id);
      
    console.log(`Top 20 fragment IDs selected`);
    
    // Step 2: Filter by interpreter
    const { data: fragments, error: fragError } = await supabase
      .from('knowledge_fragments')
      .select('id, text, source, chapter, metadata, interpreter')
      .in('id', topFragmentIds)
      .eq('interpreter', interpreter);
      
    if (fragError) {
      console.log('Error getting fragments:', fragError);
      continue;
    }
    
    console.log(`Fragments belonging to ${interpreter}: ${fragments?.length || 0}`);
    
    if (fragments && fragments.length > 0) {
      console.log('\nRetrieved fragments:');
      fragments.slice(0, 3).forEach((f, idx) => {
        const score = fragmentScores.get(f.id);
        console.log(`  ${idx + 1}. ID: ${f.id.substring(0, 8)}...`);
        console.log(`     Themes: ${score?.themes.join(', ')}`);
        console.log(`     Max similarity: ${score?.maxSim.toFixed(3)}`);
        console.log(`     Text preview: "${f.text.substring(0, 100)}..."`);
      });
    }
    
    // Let's also check what happens if we query directly for this interpreter
    console.log(`\n--- Direct query for ${interpreter} fragments with these themes ---`);
    
    const { data: directFragments } = await supabase
      .from('fragment_themes')
      .select(`
        fragment_id,
        theme_code,
        similarity,
        knowledge_fragments!inner(id, interpreter, text)
      `)
      .in('theme_code', testThemes)
      .eq('knowledge_fragments.interpreter', interpreter)
      .gte('similarity', 0.3)
      .order('similarity', { ascending: false })
      .limit(20);
      
    console.log(`Direct query found: ${directFragments?.length || 0} associations`);
    
    if (directFragments && directFragments.length > 0) {
      // Group by fragment
      const directGroups = new Map<string, any[]>();
      directFragments.forEach(df => {
        const existing = directGroups.get(df.fragment_id) || [];
        existing.push(df);
        directGroups.set(df.fragment_id, existing);
      });
      
      console.log(`Unique fragments in direct query: ${directGroups.size}`);
      console.log('\nTop fragments from direct query:');
      
      Array.from(directGroups.entries())
        .slice(0, 3)
        .forEach(([fragId, assocs], idx) => {
          const maxSim = Math.max(...assocs.map(a => a.similarity));
          const themes = assocs.map(a => a.theme_code);
          console.log(`  ${idx + 1}. Fragment: ${fragId.substring(0, 8)}...`);
          console.log(`     Themes: ${themes.join(', ')}`);
          console.log(`     Max similarity: ${maxSim.toFixed(3)}`);
        });
    }
  }
}

// Run test
debugRetrieval().catch(console.error);