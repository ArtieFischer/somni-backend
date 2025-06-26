/**
 * Test script to check which interpreters own fragments with theme associations
 * This helps identify if lakshmi and mary fragments lack theme associations
 */

import { createClient } from '@supabase/supabase-js';
import { config } from '../../config';

const supabase = createClient(
  config.supabase.url,
  config.supabase.serviceRoleKey
);

// Test themes to analyze
const TEST_THEMES = ['home', 'ocean', 'mother', 'glass', 'water'];

interface FragmentOwnership {
  fragmentId: string;
  interpreter: string;
  theme: string;
  similarity: number;
}

async function analyzeFragmentOwnership() {
  console.log('🔍 Analyzing fragment ownership for theme associations\n');
  console.log(`Testing themes: ${TEST_THEMES.join(', ')}\n`);
  
  const allResults: FragmentOwnership[] = [];
  
  for (const theme of TEST_THEMES) {
    console.log(`\n📌 Theme: "${theme}"`);
    console.log('─'.repeat(50));
    
    // Get top 10 fragments with associations for this theme
    const { data: themeAssociations, error: themeError } = await supabase
      .from('fragment_themes')
      .select('fragment_id, theme_code, similarity')
      .eq('theme_code', theme)
      .order('similarity', { ascending: false })
      .limit(10);
    
    if (themeError) {
      console.error(`Error fetching theme associations: ${themeError.message}`);
      continue;
    }
    
    if (!themeAssociations || themeAssociations.length === 0) {
      console.log(`No associations found for theme "${theme}"`);
      continue;
    }
    
    console.log(`Found ${themeAssociations.length} top associations`);
    
    // Get fragment ownership for each association
    const fragmentIds = themeAssociations.map(ta => ta.fragment_id);
    
    const { data: fragments, error: fragError } = await supabase
      .from('knowledge_fragments')
      .select('id, interpreter')
      .in('id', fragmentIds);
    
    if (fragError) {
      console.error(`Error fetching fragments: ${fragError.message}`);
      continue;
    }
    
    // Map fragment ownership
    const ownershipMap = new Map<string, string>();
    if (fragments) {
      fragments.forEach(f => ownershipMap.set(f.id, f.interpreter));
    }
    
    // Count by interpreter
    const interpreterCounts = new Map<string, number>();
    
    themeAssociations.forEach(ta => {
      const interpreter = ownershipMap.get(ta.fragment_id);
      if (interpreter) {
        interpreterCounts.set(interpreter, (interpreterCounts.get(interpreter) || 0) + 1);
        allResults.push({
          fragmentId: ta.fragment_id,
          interpreter,
          theme,
          similarity: ta.similarity
        });
      }
    });
    
    // Display results for this theme
    console.log('\nFragment ownership by interpreter:');
    const sortedInterpreters = Array.from(interpreterCounts.entries())
      .sort((a, b) => b[1] - a[1]);
    
    sortedInterpreters.forEach(([interpreter, count]) => {
      console.log(`  ${interpreter}: ${count} fragments`);
    });
    
    // Show top 3 associations with details
    console.log('\nTop 3 associations:');
    for (let i = 0; i < Math.min(3, themeAssociations.length); i++) {
      const ta = themeAssociations[i];
      const interpreter = ownershipMap.get(ta.fragment_id) || 'unknown';
      console.log(`  ${i + 1}. Fragment: ${ta.fragment_id.substring(0, 8)}...`);
      console.log(`     Interpreter: ${interpreter}`);
      console.log(`     Similarity: ${ta.similarity.toFixed(3)}`);
    }
  }
  
  // Overall summary
  console.log('\n\n' + '='.repeat(60));
  console.log('OVERALL SUMMARY');
  console.log('='.repeat(60));
  
  // Count total fragments by interpreter across all themes
  const overallCounts = new Map<string, number>();
  allResults.forEach(r => {
    overallCounts.set(r.interpreter, (overallCounts.get(r.interpreter) || 0) + 1);
  });
  
  const sortedOverall = Array.from(overallCounts.entries())
    .sort((a, b) => b[1] - a[1]);
  
  console.log('\nTotal fragments with theme associations (top 10 per theme):');
  sortedOverall.forEach(([interpreter, count]) => {
    const percentage = ((count / allResults.length) * 100).toFixed(1);
    console.log(`  ${interpreter}: ${count} fragments (${percentage}%)`);
  });
  
  // Check if lakshmi and mary have ANY theme associations
  console.log('\n\nDetailed check for lakshmi and mary:');
  
  for (const interpreter of ['lakshmi', 'mary']) {
    // Get total fragment count for interpreter
    const { count: totalFragments } = await supabase
      .from('knowledge_fragments')
      .select('*', { count: 'exact', head: true })
      .eq('interpreter', interpreter);
    
    // Get fragment IDs for interpreter
    const { data: interpreterFragments } = await supabase
      .from('knowledge_fragments')
      .select('id')
      .eq('interpreter', interpreter)
      .limit(1000); // Check first 1000
    
    if (!interpreterFragments || interpreterFragments.length === 0) {
      console.log(`\n${interpreter}: No fragments found in database`);
      continue;
    }
    
    const fragmentIds = interpreterFragments.map(f => f.id);
    
    // Check how many have ANY theme associations
    const { count: associatedCount } = await supabase
      .from('fragment_themes')
      .select('*', { count: 'exact', head: true })
      .in('fragment_id', fragmentIds);
    
    console.log(`\n${interpreter}:`);
    console.log(`  Total fragments: ${totalFragments || 0}`);
    console.log(`  Fragments with theme associations: ${associatedCount || 0}`);
    console.log(`  Percentage with associations: ${totalFragments ? ((associatedCount || 0) / totalFragments * 100).toFixed(1) : 0}%`);
    
    // If they have associations, show a sample
    if (associatedCount && associatedCount > 0) {
      const { data: sampleAssociations } = await supabase
        .from('fragment_themes')
        .select('fragment_id, theme_code, similarity')
        .in('fragment_id', fragmentIds)
        .order('similarity', { ascending: false })
        .limit(5);
      
      if (sampleAssociations && sampleAssociations.length > 0) {
        console.log(`  Sample associations:`);
        sampleAssociations.forEach(sa => {
          console.log(`    - Theme "${sa.theme_code}" → Fragment ${sa.fragment_id.substring(0, 8)}... (sim: ${sa.similarity.toFixed(3)})`);
        });
      }
    }
  }
}

// Run the analysis
analyzeFragmentOwnership()
  .then(() => {
    console.log('\n✅ Analysis complete');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Error:', error);
    process.exit(1);
  });