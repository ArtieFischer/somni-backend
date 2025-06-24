#!/usr/bin/env node
/**
 * Ingest Mary's neurocognitive dream knowledge with BGE embeddings
 * Following the same pattern as Lakshmi ingestion
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

// Configuration
const CHUNK_SIZE = 1000; // Target size in tokens
const CHUNK_OVERLAP = 150; // Overlap between chunks
const BATCH_SIZE = 5; // Process 5 chunks at a time
const INTERPRETER = 'mary'; // Fixed interpreter/author for all content

interface ChunkMetadata {
  source_file: string;
  chunk_index: number;
  total_chunks: number;
  author?: string;
  title?: string;
  topics?: string[];
}

function estimateTokens(text: string): number {
  // Rough estimation: ~4 characters per token
  return Math.ceil(text.length / 4);
}

function splitIntoChunks(text: string, metadata: { source_file: string }): Array<{ text: string; metadata: ChunkMetadata }> {
  const chunks: Array<{ text: string; metadata: ChunkMetadata }> = [];
  
  // Split by paragraphs first
  const paragraphs = text.split(/\n\n+/);
  
  let currentChunk = '';
  let chunkIndex = 0;
  
  for (const paragraph of paragraphs) {
    const trimmedPara = paragraph.trim();
    if (!trimmedPara) continue;
    
    const potentialChunk = currentChunk + (currentChunk ? '\n\n' : '') + trimmedPara;
    const tokenCount = estimateTokens(potentialChunk);
    
    if (tokenCount > CHUNK_SIZE && currentChunk) {
      // Save current chunk
      chunks.push({
        text: currentChunk,
        metadata: {
          ...metadata,
          chunk_index: chunkIndex++,
          total_chunks: 0, // Will update later
          topics: ['neuroscience', 'dreams', 'sleep']
        }
      });
      
      // Start new chunk with overlap
      const overlapText = currentChunk.split('\n').slice(-2).join('\n');
      currentChunk = overlapText + '\n\n' + trimmedPara;
    } else {
      currentChunk = potentialChunk;
    }
  }
  
  // Don't forget the last chunk
  if (currentChunk) {
    chunks.push({
      text: currentChunk,
      metadata: {
        ...metadata,
        chunk_index: chunkIndex++,
        total_chunks: 0,
        topics: ['neuroscience', 'dreams', 'sleep']
      }
    });
  }
  
  // Update total_chunks
  chunks.forEach(chunk => {
    chunk.metadata.total_chunks = chunks.length;
  });
  
  return chunks;
}

async function processFile(filePath: string): Promise<{ processed: number; failed: number }> {
  const baseName = path.basename(filePath, '.txt');
  console.log(`\n📄 Processing: ${baseName}`);
  
  try {
    const fileContent = fs.readFileSync(filePath, 'utf8');
    
    // Extract title from filename
    const title = baseName
      .replace(/-/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase());
    
    const chunks = splitIntoChunks(fileContent, {
      source_file: baseName
    });
    
    console.log(`   Created ${chunks.length} chunks`);
    
    let processed = 0;
    let failed = 0;
    
    // Process chunks in batches
    for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
      const batch = chunks.slice(i, i + BATCH_SIZE);
      
      console.log(`   Processing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(chunks.length / BATCH_SIZE)}`);
      
      // Process each chunk in the batch
      for (const chunk of batch) {
        try {
          // Generate embedding using the same method as Lakshmi
          const embedding = await bgeEmbeddingsService.generateEmbedding(chunk.text);
          
          if (!embedding || embedding.length !== 1024) {
            throw new Error(`Invalid embedding dimensions: ${embedding?.length}`);
          }
          
          // Prepare data for insertion (same structure as Lakshmi)
          const fragmentData = {
            source: baseName, // Use filename as source
            text: chunk.text,
            embedding: embedding,
            interpreter: INTERPRETER,
            metadata: {
              ...chunk.metadata,
              title,
              interpreter: INTERPRETER,
              ingested_at: new Date().toISOString()
            }
          };
          
          // Insert into database
          const { error: insertError } = await supabase
            .from('knowledge_fragments')
            .insert(fragmentData);
          
          if (insertError) throw insertError;
          
          processed++;
          
        } catch (error: any) {
          console.error(`   ❌ Failed to process chunk ${chunk.metadata.chunk_index}: ${error.message}`);
          failed++;
        }
        
        // Small delay between chunks
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      // Longer delay between batches
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    console.log(`   ✅ Completed: ${processed} chunks processed, ${failed} failed`);
    
    return { processed, failed };
    
  } catch (error: any) {
    console.error(`   ❌ Error processing file: ${error.message}`);
    return { processed: 0, failed: 1 };
  }
}

async function tagNewFragmentsWithThemes() {
  console.log('\n🏷️  Tagging new fragments with themes...');
  
  try {
    // Get count of untagged fragments for mary
    const { count: untaggedCount, error: countError } = await supabase
      .from('knowledge_fragments')
      .select('*', { count: 'exact', head: true })
      .eq('interpreter', INTERPRETER)
      .not('id', 'in', `(SELECT DISTINCT fragment_id FROM fragment_themes)`);
    
    if (countError) throw countError;
    
    console.log(`   Found ${untaggedCount || 0} untagged fragments`);
    
    if (!untaggedCount || untaggedCount === 0) {
      console.log('   ✅ No new fragments to tag');
      return;
    }
    
    console.log('   💡 Run theme tagging separately with: npm run tag:all-fragments');
    
  } catch (error: any) {
    console.error('   ❌ Error checking untagged fragments:', error.message);
  }
}

async function main() {
  console.log('🧠 Starting Mary\'s neurocognitive knowledge ingestion...');
  
  try {
    // Initialize BGE service
    await bgeEmbeddingsService.initialize();
    console.log('✓ BGE service initialized');
    
    // Clear existing Mary data
    console.log('\n🧹 Clearing existing Mary data...');
    const { error: deleteError } = await supabase
      .from('knowledge_fragments')
      .delete()
      .eq('interpreter', 'mary');
    
    if (deleteError) {
      console.error('Error clearing existing data:', deleteError);
      throw deleteError;
    }
    
    console.log('✓ Cleared existing Mary data');
    
    // Get all neurocognitive text files
    const dataDir = path.join(process.cwd(), 'RAG-data', 'neurocognitive');
    
    if (!fs.existsSync(dataDir)) {
      throw new Error(`Data directory not found: ${dataDir}`);
    }
    
    const files = fs.readdirSync(dataDir)
      .filter(f => f.endsWith('.txt'))
      .map(f => path.join(dataDir, f));
    
    console.log(`\n📚 Found ${files.length} neurocognitive texts to process`);
    
    let totalProcessed = 0;
    let totalFailed = 0;
    
    // Process each file
    for (const file of files) {
      const result = await processFile(file);
      totalProcessed += result.processed;
      totalFailed += result.failed;
    }
    
    console.log(`\n📊 Processing Summary:`);
    console.log(`   ✅ Total processed: ${totalProcessed}`);
    console.log(`   ❌ Total failed: ${totalFailed}`);
    
    // Verify ingestion
    const { count, error: countError } = await supabase
      .from('knowledge_fragments')
      .select('*', { count: 'exact', head: true })
      .eq('interpreter', 'mary');
    
    if (countError) {
      console.error('Error verifying ingestion:', countError);
    } else {
      console.log(`   💾 Total Mary fragments in database: ${count}`);
    }
    
    // Check for fragment theme tagging
    await tagNewFragmentsWithThemes();
    
    console.log('\n✅ Ingestion complete!');
    
  } catch (error: any) {
    console.error('❌ Ingestion failed:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}