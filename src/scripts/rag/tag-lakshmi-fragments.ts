#!/usr/bin/env node
/**
 * Tag Lakshmi fragments with themes
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env') });

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function tagLakshmiFragments() {
  console.log('🏷️  Tagging Lakshmi fragments with themes...\n');

  try {
    // Get all Lakshmi fragments
    const { data: allFragments, count, error: countError } = await supabase
      .from('knowledge_fragments')
      .select('id', { count: 'exact' })
      .eq('interpreter', 'lakshmi');
    
    if (countError) throw countError;
    
    console.log(`   Total Lakshmi fragments: ${count}`);
    
    // Get already tagged fragments
    const { data: taggedFragments, error: taggedError } = await supabase
      .from('fragment_themes')
      .select('fragment_id')
      .in('fragment_id', allFragments?.map(f => f.id) || []);
    
    if (taggedError) throw taggedError;
    
    const taggedIds = new Set(taggedFragments?.map(f => f.fragment_id) || []);
    const untaggedFragments = allFragments?.filter(f => !taggedIds.has(f.id)) || [];
    
    console.log(`   Already tagged: ${taggedIds.size}`);
    console.log(`   To be tagged: ${untaggedFragments.length}\n`);
    
    if (untaggedFragments.length === 0) {
      console.log('   ✅ All fragments are already tagged!');
      return;
    }
    
    // Process in batches
    const batchSize = 50;
    const topN = 10;
    let processedCount = 0;
    let totalConnections = 0;
    
    for (let i = 0; i < untaggedFragments.length; i += batchSize) {
      const batch = untaggedFragments.slice(i, i + batchSize);
      const batchIds = batch.map(f => f.id);
      
      console.log(`   Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(untaggedFragments.length / batchSize)}`);
      
      // Get fragments with embeddings
      const { data: fragments, error: fragmentError } = await supabase
        .from('knowledge_fragments')
        .select('id, embedding')
        .in('id', batchIds);
      
      if (fragmentError) throw fragmentError;
      if (!fragments || fragments.length === 0) continue;
      
      // Tag each fragment
      for (const fragment of fragments) {
        if (!fragment.embedding) {
          console.log(`   ⚠️  Fragment ${fragment.id} has no embedding, skipping`);
          continue;
        }
        
        // Get top themes
        const { data: themes, error: themeError } = await supabase.rpc('search_themes', {
          query_embedding: fragment.embedding,
          similarity_threshold: 0.0,
          max_results: topN
        });
        
        if (themeError) {
          console.error(`   ❌ Error finding themes for fragment ${fragment.id}:`, themeError);
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
      }
      
      console.log(`   ✅ Tagged ${processedCount} fragments so far`);
      
      // Small delay between batches
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    console.log('\n✅ Tagging complete!');
    console.log(`   Fragments tagged: ${processedCount}`);
    console.log(`   Total connections created: ${totalConnections}`);
    console.log(`   Average themes per fragment: ${(totalConnections / processedCount).toFixed(1)}`);
    
  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
    throw error;
  }
}

async function main() {
  console.log('🎯 Tag Lakshmi Fragments with Themes\n');
  
  await tagLakshmiFragments();
  
  // Final check
  const { count } = await supabase
    .from('knowledge_fragments')
    .select('*', { count: 'exact', head: true })
    .eq('interpreter', 'lakshmi');
  
  const { count: connectionCount } = await supabase
    .from('fragment_themes')
    .select('*', { count: 'exact', head: true })
    .in('fragment_id', (await supabase
      .from('knowledge_fragments')
      .select('id')
      .eq('interpreter', 'lakshmi')).data?.map(f => f.id) || []);
  
  console.log('\n📊 Final summary:');
  console.log(`   Total Lakshmi fragments: ${count}`);
  console.log(`   Total theme connections: ${connectionCount || 0}`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}