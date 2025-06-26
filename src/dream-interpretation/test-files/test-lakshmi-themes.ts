/**
 * Check which themes have associations for Lakshmi
 */

import { createClient } from '@supabase/supabase-js';
import { config } from '../../config';

const supabase = createClient(
  config.supabase.url,
  config.supabase.serviceRoleKey
);

async function testLakshmiThemes() {
  console.log('🔍 Finding themes with fragment associations for ALL interpreters\n');
  
  const interpreters = ['jung', 'lakshmi', 'freud', 'mary'];
  
  for (const interpreter of interpreters) {
    console.log(`\n=== ${interpreter.toUpperCase()} ===`);
    
    // Get fragment IDs for this interpreter
    const { data: fragments } = await supabase
      .from('knowledge_fragments')
      .select('id')
      .eq('interpreter', interpreter);
    
    if (!fragments || fragments.length === 0) {
      console.log(`No fragments found`);
      continue;
    }
    
    const fragmentIds = fragments.map(f => f.id);
    console.log(`Found ${fragmentIds.length} fragments`);
    
    // Get all theme associations for these fragments
    const { data: associations } = await supabase
      .from('fragment_themes')
      .select('theme_code, similarity')
      .in('fragment_id', fragmentIds)
      .gte('similarity', 0.5)
      .order('similarity', { ascending: false });
      
    if (!associations || associations.length === 0) {
      console.log('No theme associations found with similarity >= 0.5');
      
      // Try lower threshold
      const { data: lowerAssocs } = await supabase
        .from('fragment_themes')
        .select('theme_code, similarity')
        .in('fragment_id', fragmentIds)
        .gte('similarity', 0.3)
        .order('similarity', { ascending: false })
        .limit(10);
        
      if (lowerAssocs && lowerAssocs.length > 0) {
        console.log(`Found ${lowerAssocs.length} associations with similarity >= 0.3`);
        console.log('Sample:', lowerAssocs.slice(0, 3).map(a => `${a.theme_code} (${a.similarity.toFixed(3)})`).join(', '));
      }
      continue;
    }
    
    console.log(`Found ${associations.length} theme associations`);
    
    // Group by theme and count
    const themeCounts = new Map<string, { count: number; maxSim: number }>();
    
    associations.forEach(assoc => {
      const existing = themeCounts.get(assoc.theme_code) || { count: 0, maxSim: 0 };
      existing.count++;
      existing.maxSim = Math.max(existing.maxSim, assoc.similarity);
      themeCounts.set(assoc.theme_code, existing);
    });
    
    // Show top themes
    const sortedThemes = Array.from(themeCounts.entries())
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 10);
      
    console.log('Top themes:', sortedThemes.map(([theme, data]) => 
      `${theme} (${data.count})`
    ).join(', '));
  }
}

// Run test
testLakshmiThemes().catch(console.error);