/**
 * Test specific themes used in our dream test
 */

import { createClient } from '@supabase/supabase-js';
import { config } from '../../config';

const supabase = createClient(
  config.supabase.url,
  config.supabase.serviceRoleKey
);

async function testSpecificThemes() {
  console.log('🔍 Testing specific themes used in test dreams\n');
  
  const testThemes = ['home', 'ocean', 'mother', 'glass', 'water'];
  const interpreters = ['jung', 'lakshmi', 'freud', 'mary'];
  
  for (const theme of testThemes) {
    console.log(`\n=== Theme: "${theme}" ===`);
    
    // Get associations for this theme
    const { data: associations, count } = await supabase
      .from('fragment_themes')
      .select('fragment_id, similarity', { count: 'exact' })
      .eq('theme_code', theme)
      .gte('similarity', 0.5)
      .order('similarity', { ascending: false })
      .limit(100);
      
    console.log(`Total associations >= 0.5: ${count || 0}`);
    
    if (!associations || associations.length === 0) {
      // Try lower threshold
      const { count: lowerCount } = await supabase
        .from('fragment_themes')
        .select('*', { count: 'exact', head: true })
        .eq('theme_code', theme)
        .gte('similarity', 0.3);
        
      console.log(`Total associations >= 0.3: ${lowerCount || 0}`);
      continue;
    }
    
    // Get fragment details to check interpreters
    const fragmentIds = associations.map(a => a.fragment_id);
    const { data: fragments } = await supabase
      .from('knowledge_fragments')
      .select('id, interpreter')
      .in('id', fragmentIds);
      
    if (fragments) {
      // Count by interpreter
      const interpreterCounts = new Map<string, number>();
      fragments.forEach(f => {
        const count = interpreterCounts.get(f.interpreter) || 0;
        interpreterCounts.set(f.interpreter, count + 1);
      });
      
      console.log('Associations by interpreter:');
      interpreters.forEach(interp => {
        const count = interpreterCounts.get(interp) || 0;
        if (count > 0) {
          console.log(`  ${interp}: ${count}`);
        }
      });
      
      // Show top association
      const topAssoc = associations[0];
      const topFragment = fragments.find(f => f.id === topAssoc.fragment_id);
      if (topFragment) {
        console.log(`Top association: ${topFragment.interpreter} fragment (similarity: ${topAssoc.similarity.toFixed(3)})`);
      }
    }
  }
  
  // Now test a working scenario with themes we know have associations
  console.log('\n\n=== Testing with themes that have associations ===');
  const workingThemes = ['dream', 'death', 'secret', 'pregnancy', 'weapon'];
  
  for (const interpreter of interpreters) {
    console.log(`\n${interpreter.toUpperCase()}:`);
    
    // Get some fragments for this interpreter
    const { data: fragments } = await supabase
      .from('knowledge_fragments')
      .select('id')
      .eq('interpreter', interpreter)
      .limit(100);
      
    if (!fragments) continue;
    
    const fragmentIds = fragments.map(f => f.id);
    
    // Check which of the working themes have associations
    for (const theme of workingThemes) {
      const { count } = await supabase
        .from('fragment_themes')
        .select('*', { count: 'exact', head: true })
        .eq('theme_code', theme)
        .in('fragment_id', fragmentIds)
        .gte('similarity', 0.5);
        
      if (count && count > 0) {
        console.log(`  ✓ ${theme}: ${count} associations`);
      }
    }
  }
}

// Run test
testSpecificThemes().catch(console.error);