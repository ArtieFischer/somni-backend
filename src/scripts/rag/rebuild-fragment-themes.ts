#!/usr/bin/env node
/**
 * Rebuild fragment-theme connections after theme reingest
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env') });

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function rebuildFragmentThemes() {
  console.log('🔄 Rebuilding fragment-theme connections...\n');

  try {
    // Step 1: Delete all existing fragment-theme connections
    console.log('🗑️  Deleting existing fragment-theme connections...');
    const { error: deleteError, count } = await supabase
      .from('fragment_themes')
      .delete()
      .gte('created_at', '1900-01-01'); // Delete all rows
    
    if (deleteError) throw deleteError;
    console.log(`✅ Deleted ${count || 'all'} existing connections`);

    // Step 2: Count fragments
    console.log('\n📊 Counting fragments to process...');
    const { count: fragmentCount, error: countError } = await supabase
      .from('knowledge_fragments')
      .select('*', { count: 'exact', head: true });
    
    if (countError) throw countError;
    console.log(`✅ Found ${fragmentCount} fragments to process`);

    // Step 3: Process fragments in batches with Top-N approach
    console.log('\n🔧 Creating new fragment-theme connections...');
    console.log('   Using Top-10 themes per fragment approach');
    
    const batchSize = 100;
    const topN = 10;
    let processedFragments = 0;
    let totalConnections = 0;

    for (let offset = 0; offset < (fragmentCount || 0); offset += batchSize) {
      const { data: batch, error: batchError } = await supabase
        .from('knowledge_fragments')
        .select('id, embedding')
        .range(offset, Math.min(offset + batchSize - 1, (fragmentCount || 0) - 1));

      if (batchError) throw batchError;
      if (!batch || batch.length === 0) continue;

      console.log(`\n   Processing batch ${Math.floor(offset / batchSize) + 1}/${Math.ceil((fragmentCount || 0) / batchSize)}`);

      for (const fragment of batch) {
        if (!fragment.embedding) {
          console.log(`   ⚠️  Fragment ${fragment.id} has no embedding, skipping`);
          continue;
        }

        // Get top N themes for this fragment
        const { data: themes, error: themeError } = await supabase.rpc('search_themes', {
          query_embedding: fragment.embedding,
          similarity_threshold: 0.0, // Get all, we'll take top N
          max_results: topN
        });

        if (themeError) {
          console.error(`   ❌ Error finding themes for fragment ${fragment.id}:`, themeError);
          continue;
        }

        if (themes && themes.length > 0) {
          // Prepare batch insert
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
            console.error(`   ❌ Error inserting connections for fragment ${fragment.id}:`, insertError);
          } else {
            totalConnections += connections.length;
          }
        }

        processedFragments++;
      }

      console.log(`   ✅ Processed ${processedFragments}/${fragmentCount} fragments`);
      console.log(`   📊 Created ${totalConnections} connections so far`);
    }

    console.log('\n✅ Fragment-theme rebuild complete!');
    console.log(`   Total fragments processed: ${processedFragments}`);
    console.log(`   Total connections created: ${totalConnections}`);
    console.log(`   Average themes per fragment: ${(totalConnections / processedFragments).toFixed(1)}`);

    // Step 4: Verify the connections
    console.log('\n🔍 Verifying connections...');
    const { data: sampleConnections, error: verifyError } = await supabase
      .from('fragment_themes')
      .select(`
        fragment_id,
        theme_code,
        similarity,
        themes!inner(label),
        knowledge_fragments!inner(text)
      `)
      .order('similarity', { ascending: false })
      .limit(5);

    if (verifyError) throw verifyError;

    console.log('\n📋 Sample connections (highest similarity):');
    sampleConnections?.forEach((conn, i) => {
      console.log(`\n   ${i + 1}. Fragment ${conn.fragment_id} → ${conn.theme_code} (${(conn.similarity * 100).toFixed(1)}%)`);
      console.log(`      Theme: ${conn.themes.label}`);
      console.log(`      Fragment: "${conn.knowledge_fragments.text.substring(0, 100)}..."`);
    });

  } catch (error: any) {
    console.error('\n❌ Error during rebuild:', error.message);
    throw error;
  }
}

async function main() {
  console.log('🎯 Fragment-Theme Connection Rebuild\n');
  console.log('This will:');
  console.log('1. Delete all existing fragment-theme connections');
  console.log('2. Recreate connections using new theme embeddings');
  console.log('3. Use Top-10 approach for consistent tagging\n');
  
  console.log('⚠️  Make sure you have already reingested themes before running this!\n');
  
  console.log('Type "yes" to proceed: ');
  const input = await new Promise<string>(resolve => {
    process.stdin.once('data', data => resolve(data.toString().trim()));
  });
  
  if (input.toLowerCase() !== 'yes') {
    console.log('Cancelled.');
    return;
  }

  await rebuildFragmentThemes();
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}