import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function analyzeInterpreterThemes() {
  console.log('Analyzing fragment_themes for lakshmi and mary interpreters...\n');

  // Define interpreters and thresholds
  const interpreters = ['lakshmi', 'mary'];
  const thresholds = [0.3, 0.5];

  for (const interpreter of interpreters) {
    console.log(`\n========== ${interpreter.toUpperCase()} ==========`);

    // Step 1: Get fragment IDs for this interpreter
    const { data: fragments, error: fragmentError } = await supabase
      .from('knowledge_fragments')
      .select('id')
      .eq('interpreter', interpreter);

    if (fragmentError) {
      console.error(`Error fetching fragments for ${interpreter}:`, fragmentError);
      continue;
    }

    const fragmentIds = fragments?.map(f => f.id) || [];
    console.log(`Total fragments for ${interpreter}: ${fragmentIds.length}`);

    if (fragmentIds.length === 0) {
      console.log(`No fragments found for ${interpreter}`);
      continue;
    }

    // Step 2: Analyze associations at different thresholds
    for (const threshold of thresholds) {
      console.log(`\n--- Threshold >= ${threshold} ---`);

      // Get all associations for these fragments above the threshold
      const { data: associations, error: assocError } = await supabase
        .from('fragment_themes')
        .select('fragment_id, theme_id, weight')
        .in('fragment_id', fragmentIds)
        .gte('weight', threshold)
        .order('weight', { ascending: false });

      if (assocError) {
        console.error(`Error fetching associations:`, assocError);
        continue;
      }

      const totalAssociations = associations?.length || 0;
      const uniqueFragments = new Set(associations?.map(a => a.fragment_id) || []);
      const fragmentsWithAssociations = uniqueFragments.size;
      const percentageWithAssociations = ((fragmentsWithAssociations / fragmentIds.length) * 100).toFixed(1);

      console.log(`Total associations: ${totalAssociations}`);
      console.log(`Fragments with associations: ${fragmentsWithAssociations} / ${fragmentIds.length} (${percentageWithAssociations}%)`);

      // Step 3: Find themes with most associations
      const themeCounts = new Map<string, { count: number; totalWeight: number }>();
      
      for (const assoc of associations || []) {
        const themeId = assoc.theme_id;
        if (!themeCounts.has(themeId)) {
          themeCounts.set(themeId, { count: 0, totalWeight: 0 });
        }
        const theme = themeCounts.get(themeId)!;
        theme.count++;
        theme.totalWeight += assoc.weight;
      }

      // Get theme names and sort by count
      const themeIds = Array.from(themeCounts.keys());
      if (themeIds.length > 0) {
        const { data: themes, error: themeError } = await supabase
          .from('themes')
          .select('id, name')
          .in('id', themeIds);

        if (themeError) {
          console.error('Error fetching theme names:', themeError);
          continue;
        }

        // Create sorted list of themes with their counts
        const themeStats = themes?.map(theme => {
          const stats = themeCounts.get(theme.id)!;
          return {
            name: theme.name,
            count: stats.count,
            avgWeight: (stats.totalWeight / stats.count).toFixed(3)
          };
        }).sort((a, b) => b.count - a.count) || [];

        console.log(`\nTop 10 themes by association count:`);
        themeStats.slice(0, 10).forEach((theme, index) => {
          console.log(`${index + 1}. ${theme.name}: ${theme.count} associations (avg weight: ${theme.avgWeight})`);
        });
      }
    }
  }

  // Additional analysis: Direct comparison
  console.log('\n\n========== DIRECT COMPARISON ==========');
  
  for (const threshold of thresholds) {
    console.log(`\n--- Comparing at threshold >= ${threshold} ---`);
    
    const stats: Record<string, any> = {};
    
    for (const interpreter of interpreters) {
      // Get fragment IDs
      const { data: fragments } = await supabase
        .from('knowledge_fragments')
        .select('id')
        .eq('interpreter', interpreter);
      
      const fragmentIds = fragments?.map(f => f.id) || [];
      
      // Get associations above threshold
      const { data: associations } = await supabase
        .from('fragment_themes')
        .select('fragment_id')
        .in('fragment_id', fragmentIds)
        .gte('weight', threshold);
      
      const uniqueFragments = new Set(associations?.map(a => a.fragment_id) || []);
      
      stats[interpreter] = {
        totalFragments: fragmentIds.length,
        fragmentsWithAssociations: uniqueFragments.size,
        percentage: ((uniqueFragments.size / fragmentIds.length) * 100).toFixed(1)
      };
    }
    
    console.log(`Lakshmi: ${stats.lakshmi.fragmentsWithAssociations}/${stats.lakshmi.totalFragments} (${stats.lakshmi.percentage}%)`);
    console.log(`Mary: ${stats.mary.fragmentsWithAssociations}/${stats.mary.totalFragments} (${stats.mary.percentage}%)`);
  }
}

// Run the analysis
analyzeInterpreterThemes()
  .then(() => {
    console.log('\n\nAnalysis complete!');
    process.exit(0);
  })
  .catch(error => {
    console.error('Error running analysis:', error);
    process.exit(1);
  });