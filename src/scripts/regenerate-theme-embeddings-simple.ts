#!/usr/bin/env node
/**
 * Regenerate theme embeddings using only labels (not descriptions)
 * This should create more distinct embeddings for each theme
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { bgeEmbeddingsService } from '../services/embeddings-bge.service.js';

dotenv.config({ path: path.join(process.cwd(), '.env') });

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function regenerateThemeEmbeddings() {
  console.log('🔄 Regenerating theme embeddings using labels only...\n');
  
  try {
    // Get all themes
    const { data: themes, error } = await supabase
      .from('themes')
      .select('code, label')
      .order('code');
    
    if (error || !themes) {
      throw new Error(`Failed to fetch themes: ${error?.message}`);
    }
    
    console.log(`📊 Found ${themes.length} themes to regenerate\n`);
    
    let processed = 0;
    let failed = 0;
    
    for (const theme of themes) {
      try {
        // Generate embedding from label only
        // Add "dream symbol" context to help the model understand these are dream symbols
        const embeddingText = `Dream symbol: ${theme.label}`;
        
        console.log(`Processing ${theme.code}: "${embeddingText}"`);
        
        const embedding = await bgeEmbeddingsService.generateEmbedding(embeddingText);
        
        if (!embedding || embedding.length !== 1024) {
          throw new Error(`Invalid embedding dimensions: ${embedding?.length}`);
        }
        
        // Update theme
        const { error: updateError } = await supabase
          .from('themes')
          .update({
            embedding: embedding,
            embedding_version: 'bge-m3-label-only'
          })
          .eq('code', theme.code);
        
        if (updateError) {
          throw updateError;
        }
        
        processed++;
        
        // Progress update
        if (processed % 50 === 0) {
          console.log(`\n✅ Progress: ${processed}/${themes.length}\n`);
        }
        
      } catch (error: any) {
        console.error(`❌ Failed ${theme.code}: ${error.message}`);
        failed++;
      }
      
      // Small delay
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    console.log(`\n✅ Regeneration complete!`);
    console.log(`   Processed: ${processed}`);
    console.log(`   Failed: ${failed}`);
    
    // Test the new embeddings
    await testNewEmbeddings();
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

async function testNewEmbeddings() {
  console.log('\n🧪 Testing new embeddings on Jung fragment...\n');
  
  // Get the same test fragment
  const { data: fragment } = await supabase
    .from('knowledge_fragments')
    .select('id, text')
    .ilike('text', '%collective unconscious%')
    .limit(1)
    .single();
  
  if (!fragment) return;
  
  console.log(`Test fragment: "${fragment.text.substring(0, 150)}..."\n`);
  
  // Get top themes
  const { data: topThemes } = await supabase.rpc('get_top_n_themes_for_fragment', {
    p_fragment_id: fragment.id,
    p_top_n: 15
  });
  
  if (topThemes) {
    console.log('Top 15 themes with new embeddings:');
    topThemes.forEach((theme: any, i: number) => {
      console.log(`  ${i + 1}. ${theme.theme_code} (${(theme.similarity * 100).toFixed(1)}%)`);
    });
    
    console.log('\n💡 These should now be more psychologically relevant!');
  }
}

async function main() {
  console.log('🎯 Theme Embedding Regeneration\n');
  console.log('This will regenerate embeddings using only theme labels');
  console.log('to create more distinct embeddings for each theme.\n');
  
  console.log('⚠️  WARNING: This will update all theme embeddings!\n');
  console.log('Type "yes" to continue: ');
  
  const input = await new Promise<string>(resolve => {
    process.stdin.once('data', data => resolve(data.toString().trim()));
  });
  
  if (input.toLowerCase() !== 'yes') {
    console.log('Cancelled.');
    return;
  }
  
  await regenerateThemeEmbeddings();
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}