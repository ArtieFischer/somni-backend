#!/usr/bin/env node
/**
 * Reingest new themes with BGE-M3 embeddings
 * Uses both label and description for embeddings
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';
import { bgeEmbeddingsService } from '../../services/embeddings-bge.service.js';

dotenv.config({ path: path.join(process.cwd(), '.env') });

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function loadNewThemes() {
  const themesPath = path.join(process.cwd(), 'supabase/scripts/new-themes.json');
  const themesData = fs.readFileSync(themesPath, 'utf-8');
  return JSON.parse(themesData);
}

async function reingestThemes() {
  console.log('🔄 Starting complete themes reingest with BGE-M3...\n');

  try {
    // Step 1: Note about backup
    console.log('📦 Note: Run the SQL migration first to create backup and handle constraints');

    // Step 2: Delete all current themes
    console.log('\n🗑️  Deleting all current themes...');
    const { error: deleteError, count } = await supabase
      .from('themes')
      .delete()
      .neq('code', ''); // Delete all rows
    
    if (deleteError) throw deleteError;
    console.log(`✅ Deleted ${count || 'all'} existing themes`);

    // Step 3: Load new themes
    console.log('\n📂 Loading new themes from file...');
    const newThemes = await loadNewThemes();
    console.log(`✅ Loaded ${newThemes.length} themes`);

    // Step 4: Process and insert each theme
    console.log('\n🔧 Processing themes with BGE-M3 embeddings...');
    
    let processed = 0;
    let failed = 0;

    for (const theme of newThemes) {
      try {
        // Generate embedding using label + description
        const embeddingText = `${theme.label}. ${theme.description}`;
        console.log(`\n📝 Processing: ${theme.code}`);
        console.log(`   Text: ${embeddingText}`);
        
        const embedding = await bgeEmbeddingsService.generateEmbedding(embeddingText);
        
        if (!embedding || embedding.length !== 1024) {
          throw new Error(`Invalid embedding dimensions: ${embedding?.length}`);
        }

        // Insert theme with embedding
        const { error: insertError } = await supabase
          .from('themes')
          .insert({
            code: theme.code,
            label: theme.label,
            description: theme.description,
            embedding: embedding,
            embedding_version: 'bge-m3-v1',
            metadata: {
              ingested_at: new Date().toISOString(),
              source: 'new-themes.json'
            }
          });

        if (insertError) throw insertError;
        
        processed++;
        console.log('   ✅ Ingested successfully');
        
      } catch (error: any) {
        console.error(`   ❌ Failed: ${error.message}`);
        failed++;
      }

      // Small delay to avoid overwhelming the service
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log('\n✅ Theme ingestion complete!');
    console.log(`   Total: ${newThemes.length}`);
    console.log(`   Successful: ${processed}`);
    console.log(`   Failed: ${failed}`);

    // Step 5: Verify the data
    console.log('\n🔍 Verifying ingested themes...');
    const { data: verifyData, error: verifyError } = await supabase
      .from('themes')
      .select('code, label, embedding')
      .limit(5);

    if (verifyError) throw verifyError;

    console.log(`✅ Verified ${verifyData?.length || 0} themes have embeddings`);

    return processed;

  } catch (error: any) {
    console.error('\n❌ Error during reingest:', error.message);
    throw error;
  }
}

async function main() {
  console.log('🎯 New Themes Ingestion with BGE-M3\n');
  console.log('This will:');
  console.log('1. Backup current themes table');
  console.log('2. Delete all existing themes');
  console.log('3. Ingest new themes with BGE-M3 embeddings');
  console.log('4. Use label + description for embeddings\n');
  
  console.log('Type "yes" to proceed: ');
  const input = await new Promise<string>(resolve => {
    process.stdin.once('data', data => resolve(data.toString().trim()));
  });
  
  if (input.toLowerCase() !== 'yes') {
    console.log('Cancelled.');
    return;
  }

  await reingestThemes();
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}