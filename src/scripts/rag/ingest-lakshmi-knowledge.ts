#!/usr/bin/env node
/**
 * Ingest Lakshmi's new-age dream knowledge with BGE-M3 embeddings
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
const INTERPRETER = 'lakshmi'; // Fixed interpreter/author for all content

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
    
    const currentTokens = estimateTokens(currentChunk);
    const paragraphTokens = estimateTokens(trimmedPara);
    
    // If adding this paragraph would exceed chunk size, save current chunk
    if (currentChunk && currentTokens + paragraphTokens > CHUNK_SIZE) {
      chunks.push({
        text: currentChunk.trim(),
        metadata: {
          ...metadata,
          chunk_index: chunkIndex,
          total_chunks: 0 // Will update later
        }
      });
      
      // Start new chunk with overlap
      const words = currentChunk.split(' ');
      const overlapWords = words.slice(-30).join(' '); // Roughly 150 tokens
      currentChunk = overlapWords + '\n\n' + trimmedPara;
      chunkIndex++;
    } else {
      currentChunk += (currentChunk ? '\n\n' : '') + trimmedPara;
    }
  }
  
  // Don't forget the last chunk
  if (currentChunk.trim()) {
    chunks.push({
      text: currentChunk.trim(),
      metadata: {
        ...metadata,
        chunk_index: chunkIndex,
        total_chunks: 0
      }
    });
  }
  
  // Update total chunks count
  chunks.forEach(chunk => {
    chunk.metadata.total_chunks = chunks.length;
  });
  
  return chunks;
}

async function processFile(filePath: string, fileName: string) {
  console.log(`\n📖 Processing: ${fileName}`);
  
  try {
    // Read file
    const content = fs.readFileSync(filePath, 'utf-8');
    console.log(`   File size: ${(content.length / 1024).toFixed(1)} KB`);
    
    // Extract metadata from filename
    const baseName = path.basename(fileName, '.txt');
    const metadata = {
      source_file: fileName,
      title: baseName.replace(/-/g, ' '),
      author: 'Various' // Could be extracted if pattern is consistent
    };
    
    // Split into chunks
    const chunks = splitIntoChunks(content, metadata);
    console.log(`   Created ${chunks.length} chunks`);
    
    // Process in batches
    let processed = 0;
    let failed = 0;
    
    for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
      const batch = chunks.slice(i, i + BATCH_SIZE);
      
      console.log(`   Processing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(chunks.length / BATCH_SIZE)}`);
      
      // Process each chunk in the batch
      for (const chunk of batch) {
        try {
          // Generate embedding
          const embedding = await bgeEmbeddingsService.generateEmbedding(chunk.text);
          
          if (!embedding || embedding.length !== 1024) {
            throw new Error(`Invalid embedding dimensions: ${embedding?.length}`);
          }
          
          // Prepare data for insertion
          const fragmentData = {
            source: baseName, // Use filename as source
            text: chunk.text,
            embedding: embedding,
            interpreter: INTERPRETER,
            metadata: {
              ...chunk.metadata,
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
    // Get count of untagged fragments for lakshmi
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
    
    // Process in batches
    const batchSize = 50;
    const topN = 10;
    let tagged = 0;
    
    for (let offset = 0; offset < untaggedCount; offset += batchSize) {
      // Get untagged fragments
      const { data: fragments, error: fragmentError } = await supabase
        .from('knowledge_fragments')
        .select('id, embedding')
        .eq('interpreter', INTERPRETER)
        .not('id', 'in', `(SELECT DISTINCT fragment_id FROM fragment_themes)`)
        .range(offset, Math.min(offset + batchSize - 1, untaggedCount - 1));
      
      if (fragmentError) throw fragmentError;
      if (!fragments || fragments.length === 0) continue;
      
      console.log(`   Tagging batch ${Math.floor(offset / batchSize) + 1}/${Math.ceil(untaggedCount / batchSize)}`);
      
      // Tag each fragment
      for (const fragment of fragments) {
        if (!fragment.embedding) continue;
        
        // Get top themes
        const { data: themes, error: themeError } = await supabase.rpc('search_themes', {
          query_embedding: fragment.embedding,
          similarity_threshold: 0.0,
          max_results: topN
        });
        
        if (themeError || !themes || themes.length === 0) continue;
        
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
        
        if (!insertError) tagged++;
      }
    }
    
    console.log(`   ✅ Tagged ${tagged} fragments with themes`);
    
  } catch (error: any) {
    console.error(`   ❌ Error tagging fragments: ${error.message}`);
  }
}

async function main() {
  console.log('🔮 Lakshmi Knowledge Base Ingestion\n');
  console.log('This will:');
  console.log('1. Read all files from RAG-data/new-age/');
  console.log('2. Split into chunks and generate BGE-M3 embeddings');
  console.log('3. Store in knowledge_fragments table with interpreter="lakshmi"');
  console.log('4. Tag fragments with themes\n');
  
  // Get all text files in the directory
  const dataDir = path.join(process.cwd(), 'RAG-data/new-age');
  const files = fs.readdirSync(dataDir).filter(f => f.endsWith('.txt'));
  
  console.log(`Found ${files.length} files to process:`);
  files.forEach(f => console.log(`  - ${f}`));
  
  console.log('\nType "yes" to proceed: ');
  const input = await new Promise<string>(resolve => {
    process.stdin.once('data', data => resolve(data.toString().trim()));
  });
  
  if (input.toLowerCase() !== 'yes') {
    console.log('Cancelled.');
    return;
  }
  
  // Process each file
  let totalProcessed = 0;
  let totalFailed = 0;
  
  for (const file of files) {
    const filePath = path.join(dataDir, file);
    const { processed, failed } = await processFile(filePath, file);
    totalProcessed += processed;
    totalFailed += failed;
  }
  
  console.log('\n✅ Ingestion complete!');
  console.log(`   Total chunks processed: ${totalProcessed}`);
  console.log(`   Total chunks failed: ${totalFailed}`);
  
  // Tag fragments with themes
  await tagNewFragmentsWithThemes();
  
  // Final summary
  const { count: fragmentCount } = await supabase
    .from('knowledge_fragments')
    .select('*', { count: 'exact', head: true })
    .eq('author', INTERPRETER);
  
  console.log(`\n📊 Final summary:`);
  console.log(`   Total Lakshmi fragments in database: ${fragmentCount}`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}