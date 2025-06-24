#!/usr/bin/env node
/**
 * Tag Mary fragments with themes
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env') });

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function tagMaryFragments() {
  console.log('🧠 Tagging Mary fragments with themes...\n');

  try {
    // Get all Mary fragments
    const { data: allFragments, count, error: countError } = await supabase
      .from('knowledge_fragments')
      .select('id', { count: 'exact' })
      .eq('interpreter', 'mary');
    
    if (countError) throw countError;
    
    console.log(`   Total Mary fragments: ${count}`);
    
    // Get already tagged fragments in batches to avoid URI too large error
    const taggedIds = new Set<string>();
    const fragmentIds = allFragments?.map(f => f.id) || [];
    
    // Process in chunks of 100 IDs to check which are already tagged
    for (let i = 0; i < fragmentIds.length; i += 100) {
      const chunk = fragmentIds.slice(i, i + 100);
      const { data: taggedFragments, error: taggedError } = await supabase
        .from('fragment_themes')
        .select('fragment_id')
        .in('fragment_id', chunk);
      
      if (taggedError) throw taggedError;
      
      taggedFragments?.forEach(f => taggedIds.add(f.fragment_id));
    }
    
    const untaggedFragments = allFragments?.filter(f => !taggedIds.has(f.id)) || [];
    
    console.log(`   Already tagged: ${taggedIds.size}`);
    console.log(`   To be tagged: ${untaggedFragments.length}\n`);
    
    if (untaggedFragments.length === 0) {
      console.log('   ✅ All fragments are already tagged!');
      return;
    }
    
    // Process in batches
    const batchSize = 10;
    const topN = 10; // Number of themes per fragment
    let processedCount = 0;
    const startTime = Date.now();
    
    for (let i = 0; i < untaggedFragments.length; i += batchSize) {
      const batch = untaggedFragments.slice(i, i + batchSize);
      
      console.log(`\n📦 Processing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(untaggedFragments.length/batchSize)}...`);
      
      for (const fragment of batch) {
        try {
          // Get top N themes for this fragment
          const { data: topThemes, error: themeError } = await supabase.rpc('get_top_n_themes_for_fragment', {
            p_fragment_id: fragment.id,
            p_top_n: topN
          });
          
          if (themeError) {
            console.error(`   ❌ Error getting themes for fragment ${fragment.id}: ${themeError.message}`);
            continue;
          }
          
          if (topThemes && topThemes.length > 0) {
            // Insert the themes
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
              console.error(`   ❌ Error inserting themes: ${insertError.message}`);
            } else {
              processedCount++;
            }
          }
          
        } catch (error: any) {
          console.error(`   ❌ Error processing fragment ${fragment.id}: ${error.message}`);
        }
      }
      
      // Progress update
      const elapsed = (Date.now() - startTime) / 1000;
      const rate = processedCount / elapsed;
      const remaining = (untaggedFragments.length - processedCount) / rate;
      
      console.log(`   ✅ Tagged ${processedCount}/${untaggedFragments.length} fragments (${rate.toFixed(1)} fragments/sec, ~${Math.ceil(remaining)}s remaining)`);
      
      // Small delay between batches
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    // Final report
    console.log('\n📊 Tagging Summary:');
    console.log(`   ✅ Successfully tagged: ${processedCount} fragments`);
    console.log(`   ❌ Failed: ${untaggedFragments.length - processedCount} fragments`);
    console.log(`   ⏱️  Time taken: ${((Date.now() - startTime) / 1000).toFixed(1)} seconds`);
    
    // Verify final state
    const { count: finalCount } = await supabase
      .from('fragment_themes')
      .select('*', { count: 'exact', head: true })
      .in('fragment_id', allFragments?.map(f => f.id) || []);
    
    console.log(`   💾 Total Mary fragments with themes: ${finalCount}`);
    
  } catch (error: any) {
    console.error('❌ Tagging failed:', error.message);
    process.exit(1);
  }
}

async function main() {
  await tagMaryFragments();
  console.log('\n✅ Mary fragment tagging complete!');
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}