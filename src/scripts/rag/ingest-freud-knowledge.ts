#!/usr/bin/env node
/**
 * Ingest Freud knowledge base from text files
 * Creates embeddings and stores in knowledge_fragments table
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';
import { fileURLToPath } from 'url';
import { bgeEmbeddingsService } from '../../services/embeddings-bge.service.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(process.cwd(), '.env') });

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Configuration
const INTERPRETER = 'freud';
const KNOWLEDGE_DIR = path.join(process.cwd(), 'RAG-data', 'freud');
const CHUNK_SIZE = 600; // Characters per chunk
const CHUNK_OVERLAP = 100; // Character overlap between chunks

// Text chunking function
function chunkText(text: string, filename: string): Array<{text: string, metadata: any}> {
  const chunks: Array<{text: string, metadata: any}> = [];
  
  // Clean the text
  text = text.replace(/\r\n/g, '\n').trim();
  
  // Simple chunking by character count with overlap
  for (let i = 0; i < text.length; i += CHUNK_SIZE - CHUNK_OVERLAP) {
    const chunk = text.slice(i, i + CHUNK_SIZE);
    
    // Skip chunks that are too short
    if (chunk.length < 100) continue;
    
    chunks.push({
      text: chunk,
      metadata: {
        chunk_index: chunks.length,
        char_start: i,
        char_end: Math.min(i + CHUNK_SIZE, text.length),
        source_file: filename
      }
    });
  }
  
  return chunks;
}

async function processFile(filePath: string) {
  const fileName = path.basename(filePath);
  const baseName = path.basename(filePath, '.txt');
  
  console.log(`\n📄 Processing: ${fileName}`);
  
  try {
    // Read file
    const content = fs.readFileSync(filePath, 'utf-8');
    console.log(`   File size: ${(content.length / 1024).toFixed(1)} KB`);
    
    // Chunk the text
    const chunks = chunkText(content, fileName);
    console.log(`   Created ${chunks.length} chunks`);
    
    // Process each chunk
    let successCount = 0;
    let errorCount = 0;
    
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      
      try {
        // Generate embedding
        const embedding = await bgeEmbeddingsService.generateEmbedding(chunk.text);
        
        // Prepare fragment data
        const title = `${baseName} - Part ${i + 1}`;
        const fragmentData = {
          source: baseName,
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
        const { error } = await supabase
          .from('knowledge_fragments')
          .insert(fragmentData);
        
        if (error) {
          console.error(`   ❌ Error inserting chunk ${i + 1}:`, error.message);
          errorCount++;
        } else {
          successCount++;
          if (successCount % 10 === 0) {
            console.log(`   ✅ Progress: ${successCount}/${chunks.length} chunks`);
          }
        }
        
      } catch (err: any) {
        console.error(`   ❌ Error processing chunk ${i + 1}:`, err.message);
        errorCount++;
      }
      
      // Small delay to avoid overwhelming the service
      if (i % 5 === 0) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    console.log(`   ✅ Completed: ${successCount} chunks, ${errorCount} errors`);
    return { fileName, total: chunks.length, success: successCount, errors: errorCount };
    
  } catch (error: any) {
    console.error(`   ❌ Failed to process file:`, error.message);
    return { fileName, total: 0, success: 0, errors: 1 };
  }
}

async function main() {
  console.log('🧠 Freud Knowledge Ingestion\n');
  console.log(`📁 Source directory: ${KNOWLEDGE_DIR}`);
  console.log(`🎯 Target interpreter: ${INTERPRETER}`);
  console.log(`📏 Chunk size: ${CHUNK_SIZE} chars with ${CHUNK_OVERLAP} overlap\n`);
  
  try {
    // Initialize BGE service
    console.log('🚀 Initializing BGE embeddings service...');
    await bgeEmbeddingsService.initialize();
    console.log('✅ BGE service ready\n');
    
    // Check existing fragments
    const { count: existingCount } = await supabase
      .from('knowledge_fragments')
      .select('*', { count: 'exact', head: true })
      .eq('interpreter', INTERPRETER);
    
    if (existingCount && existingCount > 0) {
      console.log(`⚠️  Found ${existingCount} existing ${INTERPRETER} fragments`);
      console.log('   These will remain in the database\n');
    }
    
    // Get all text files
    const files = fs.readdirSync(KNOWLEDGE_DIR)
      .filter(f => f.endsWith('.txt'))
      .map(f => path.join(KNOWLEDGE_DIR, f))
      .sort();
    
    console.log(`📚 Found ${files.length} text files to process\n`);
    
    // Process each file
    const results = [];
    for (const filePath of files) {
      const result = await processFile(filePath);
      results.push(result);
      
      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }
    }
    
    // Summary
    console.log('\n📊 Ingestion Summary:');
    console.log('   File Results:');
    results.forEach(r => {
      console.log(`   - ${r.fileName}: ${r.success}/${r.total} chunks`);
    });
    
    const totalChunks = results.reduce((sum, r) => sum + r.total, 0);
    const totalSuccess = results.reduce((sum, r) => sum + r.success, 0);
    const totalErrors = results.reduce((sum, r) => sum + r.errors, 0);
    
    console.log(`\n   Total: ${totalSuccess}/${totalChunks} chunks ingested`);
    if (totalErrors > 0) {
      console.log(`   ⚠️  Errors: ${totalErrors}`);
    }
    
    // Final count
    const { count: finalCount } = await supabase
      .from('knowledge_fragments')
      .select('*', { count: 'exact', head: true })
      .eq('interpreter', INTERPRETER);
    
    console.log(`\n✅ Complete! Total ${INTERPRETER} fragments in database: ${finalCount}`);
    
  } catch (error: any) {
    console.error('❌ Fatal error:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}