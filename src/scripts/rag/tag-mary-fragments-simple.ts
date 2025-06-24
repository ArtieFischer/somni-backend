#!/usr/bin/env node
/**
 * Tag Mary fragments with themes - simplified version
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
    // Get total count of Mary fragments
    const { count: totalCount, error: countError } = await supabase
      .from('knowledge_fragments')
      .select('*', { count: 'exact', head: true })
      .eq('interpreter', 'mary');
    
    if (countError) throw countError;
    console.log(`   Total Mary fragments: ${totalCount}`);
    
    // Process all fragments in batches
    const batchSize = 50;
    const topN = 10;
    let processedCount = 0;
    let skippedCount = 0;
    let totalConnections = 0;
    
    for (let offset = 0; offset < (totalCount || 0); offset += batchSize) {
      console.log(`\n   Processing batch ${Math.floor(offset / batchSize) + 1}/${Math.ceil((totalCount || 0) / batchSize)}`);
      
      // Get batch of fragments
      const { data: fragments, error: fragmentError } = await supabase
        .from('knowledge_fragments')
        .select('id, embedding')
        .eq('interpreter', 'mary')
        .range(offset, Math.min(offset + batchSize - 1, (totalCount || 0) - 1));
      
      if (fragmentError) throw fragmentError;
      if (!fragments || fragments.length === 0) continue;
      
      // Process each fragment
      for (const fragment of fragments) {
        if (!fragment.embedding) {
          console.log(`   ⚠️  Fragment ${fragment.id} has no embedding, skipping`);
          skippedCount++;
          continue;
        }
        
        // Check if already tagged
        const { data: existingTags, error: checkError } = await supabase
          .from('fragment_themes')
          .select('fragment_id')
          .eq('fragment_id', fragment.id)
          .limit(1);
        
        if (checkError) {
          console.error(`   ❌ Error checking tags for ${fragment.id}:`, checkError);
          continue;
        }
        
        if (existingTags && existingTags.length > 0) {
          skippedCount++;
          continue; // Already tagged
        }
        
        // Get top themes
        const { data: themes, error: themeError } = await supabase.rpc('search_themes', {
          query_embedding: fragment.embedding,
          similarity_threshold: 0.0,
          max_results: topN
        });
        
        if (themeError) {
          console.error(`   ❌ Error finding themes:`, themeError);
          continue;
        }
        
        if (themes && themes.length > 0) {
          // Create connections
          const connections = themes.map(theme => ({
            fragment_id: fragment.id,
            theme_code: theme.code,
            similarity: theme.similarity,
            created_at: new Date().toISOString()
          }));
          
          const { error: insertError } = await supabase
            .from('fragment_themes')
            .insert(connections);
          
          if (insertError) {
            console.error(`   ❌ Error inserting connections:`, insertError);
          } else {
            totalConnections += connections.length;
            processedCount++;
          }
        }
        
        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 50));
      }
      
      console.log(`   ✅ Progress: ${processedCount} tagged, ${skippedCount} skipped`);
    }
    
    console.log('\n✅ Tagging complete!');
    console.log(`   New fragments tagged: ${processedCount}`);
    console.log(`   Fragments skipped: ${skippedCount}`);
    console.log(`   Total connections created: ${totalConnections}`);
    if (processedCount > 0) {
      console.log(`   Average themes per fragment: ${(totalConnections / processedCount).toFixed(1)}`);
    }
    
  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
    throw error;
  }
}

async function main() {
  console.log('🎯 Tag Mary Fragments with Themes (Simple Version)\n');
  
  await tagMaryFragments();
  
  // Final verification
  console.log('\n📊 Verifying results...');
  
  const { count: fragmentCount } = await supabase
    .from('knowledge_fragments')
    .select('*', { count: 'exact', head: true })
    .eq('interpreter', 'mary');
  
  console.log(`   Total Mary fragments: ${fragmentCount}`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}