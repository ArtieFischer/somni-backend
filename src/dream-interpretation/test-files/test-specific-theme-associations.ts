/**
 * Check associations for specific test themes
 */

import { createClient } from '@supabase/supabase-js';
import { config } from '../../config';

const supabase = createClient(
  config.supabase.url,
  config.supabase.serviceRoleKey
);

async function checkSpecificThemeAssociations() {
  console.log('🔍 Checking associations for specific test themes\n');
  
  const testThemes = ['home', 'ocean', 'mother', 'glass', 'water'];
  const interpreters = ['jung', 'lakshmi', 'freud', 'mary'];
  
  // For each theme, check associations by interpreter
  for (const theme of testThemes) {
    console.log(`\n📌 Theme: "${theme}"`);
    console.log('─'.repeat(50));
    
    for (const interpreter of interpreters) {
      // Get fragments for this interpreter that have associations with this theme
      const { data: associations, error } = await supabase
        .from('fragment_themes')
        .select(`
          fragment_id,
          similarity,
          knowledge_fragments!inner(interpreter)
        `)
        .eq('theme_code', theme)
        .eq('knowledge_fragments.interpreter', interpreter)
        .gte('similarity', 0.3)  // Using the lower threshold
        .order('similarity', { ascending: false })
        .limit(5);
        
      if (error) {
        console.log(`  ${interpreter}: Error - ${error.message}`);
        continue;
      }
      
      if (!associations || associations.length === 0) {
        console.log(`  ${interpreter}: No associations found (even at 0.3 threshold)`);
      } else {
        console.log(`  ${interpreter}: ${associations.length} associations found`);
        const topSim = associations[0].similarity;
        const avgSim = associations.reduce((sum, a) => sum + a.similarity, 0) / associations.length;
        console.log(`    Top similarity: ${topSim.toFixed(3)}, Average: ${avgSim.toFixed(3)}`);
      }
    }
  }
  
  // Now let's check what themes lakshmi and mary DO have good associations with
  console.log('\n\n=== TOP THEMES FOR LAKSHMI AND MARY ===');
  
  for (const interpreter of ['lakshmi', 'mary']) {
    console.log(`\n${interpreter.toUpperCase()}:`);
    
    // Get all theme associations for this interpreter
    const { data: associations } = await supabase
      .from('fragment_themes')
      .select(`
        theme_code,
        similarity,
        knowledge_fragments!inner(interpreter)
      `)
      .eq('knowledge_fragments.interpreter', interpreter)
      .gte('similarity', 0.5)  // Good quality associations
      .order('similarity', { ascending: false })
      .limit(20);
      
    if (associations && associations.length > 0) {
      // Group by theme and count
      const themeCount = new Map<string, { count: number; maxSim: number }>();
      
      associations.forEach(assoc => {
        const existing = themeCount.get(assoc.theme_code) || { count: 0, maxSim: 0 };
        existing.count++;
        existing.maxSim = Math.max(existing.maxSim, assoc.similarity);
        themeCount.set(assoc.theme_code, existing);
      });
      
      // Sort by count and show top themes
      const sortedThemes = Array.from(themeCount.entries())
        .sort((a, b) => b[1].count - a[1].count)
        .slice(0, 10);
        
      console.log('Top themes with good associations:');
      sortedThemes.forEach(([theme, data], idx) => {
        console.log(`  ${idx + 1}. "${theme}": ${data.count} fragments (max similarity: ${data.maxSim.toFixed(3)})`);
      });
    }
  }
}

// Run test
checkSpecificThemeAssociations().catch(console.error);