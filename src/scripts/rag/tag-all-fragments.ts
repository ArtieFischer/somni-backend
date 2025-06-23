#!/usr/bin/env node
/**
 * Tag ALL fragments with top N themes using pagination
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env') });

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function tagAllFragments(topN = 10) {
  console.log(`🏷️  Tagging ALL fragments with top ${topN} themes each...\n`);
  
  try {
    // Clear existing
    console.log('🧹 Clearing existing relationships...');
    await supabase.from('fragment_themes').delete().gte('similarity', 0);
    
    // Get total count
    const { count: totalCount } = await supabase
      .from('knowledge_fragments')
      .select('*', { count: 'exact', head: true })
      .not('embedding', 'is', null);
    
    console.log(`📊 Found ${totalCount} total fragments to process\n`);
    
    // Process in batches of 1000 (Supabase default limit)
    const batchSize = 1000;
    let processedTotal = 0;
    const startTime = Date.now();
    
    for (let offset = 0; offset < totalCount!; offset += batchSize) {
      console.log(`\n📦 Fetching batch ${Math.floor(offset/batchSize) + 1}/${Math.ceil(totalCount!/batchSize)}...`);
      
      // Get batch of fragment IDs
      const { data: fragments, error: fragmentError } = await supabase
        .from('knowledge_fragments')
        .select('id')
        .not('embedding', 'is', null)
        .order('id')
        .range(offset, offset + batchSize - 1);
      
      if (fragmentError || !fragments) {
        console.error(`❌ Error fetching batch: ${fragmentError?.message}`);
        continue;
      }
      
      console.log(`   Processing ${fragments.length} fragments...`);
      
      // Process each fragment in the batch
      for (const fragment of fragments) {
        // Get top N themes for this fragment
        const { data: topThemes, error: topError } = await supabase.rpc('get_top_n_themes_for_fragment', {
          p_fragment_id: fragment.id,
          p_top_n: topN
        });
        
        if (topError) {
          console.error(`❌ Error getting themes for fragment ${fragment.id}: ${topError.message}`);
          continue;
        }
        
        // Insert the top themes
        if (topThemes && topThemes.length > 0) {
          const { error: insertError } = await supabase
            .from('fragment_themes')
            .insert(
              topThemes.map((theme: any) => ({
                fragment_id: fragment.id,
                theme_code: theme.theme_code,
                similarity: theme.similarity
              }))
            );
          
          if (insertError) {
            console.error(`❌ Error inserting themes: ${insertError.message}`);
          }
        }
        
        processedTotal++;
        
        // Progress update every 100 fragments
        if (processedTotal % 100 === 0) {
          const elapsed = (Date.now() - startTime) / 1000;
          const rate = processedTotal / elapsed;
          const remaining = (totalCount! - processedTotal) / rate;
          
          console.log(`   ✅ Processed ${processedTotal}/${totalCount} fragments (${rate.toFixed(1)} fragments/sec, ~${Math.ceil(remaining)}s remaining)`);
        }
      }
    }
    
    // Final statistics
    const { count: totalRelationships } = await supabase
      .from('fragment_themes')
      .select('*', { count: 'exact', head: true });
    
    console.log(`\n✅ Tagging complete!`);
    console.log(`   Total fragments processed: ${processedTotal}`);
    console.log(`   Total relationships: ${totalRelationships}`);
    console.log(`   Average themes per fragment: ${(totalRelationships! / processedTotal).toFixed(1)}`);
    
    // Show theme distribution
    const { data: topUsedThemes } = await supabase.rpc('get_most_used_themes');
    
    if (topUsedThemes) {
      console.log('\n📊 Most frequently matched themes:');
      console.table(topUsedThemes.slice(0, 10));
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

async function main() {
  console.log('📋 Complete Fragment Tagging with Pagination\n');
  console.log('This will process ALL fragments using pagination.\n');
  
  console.log('Enter number of top themes per fragment (5-20, default 10): ');
  const input = await new Promise<string>(resolve => {
    process.stdin.once('data', data => resolve(data.toString().trim()));
  });
  
  const topN = parseInt(input) || 10;
  
  // Run tagging
  await tagAllFragments(topN);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}