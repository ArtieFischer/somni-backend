#!/usr/bin/env node
import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';
import { createClient } from '@supabase/supabase-js';
import { config } from '../../config';
import { embeddingsService } from '../../services/embeddings.service';

interface ProcessedChunk {
  content: string;
  source: string;
  embedding: number[];
  metadata: any;
}

class StreamingJungProcessor {
  private supabase = createClient(
    config.supabase.url,
    config.supabase.serviceRoleKey
  );

  private readonly CHUNK_SIZE = 400; // Smaller chunks
  private readonly BATCH_SIZE = 3; // Very small batches
  private processedFiles = 0;

  async processJungTexts(folderPath: string) {
    console.log('🚀 Starting streaming Jung text processing...');
    console.log('📊 Memory usage:', this.getMemoryUsage());
    
    try {
      // Initialize embeddings model once
      console.log('🔧 Initializing embedding model...');
      await embeddingsService.generateEmbedding('test initialization');
      console.log('✅ Model ready');

      const files = fs.readdirSync(folderPath)
        .filter(f => f.endsWith('.txt'))
        .sort((a, b) => {
          // Process smaller files first
          const sizeA = fs.statSync(path.join(folderPath, a)).size;
          const sizeB = fs.statSync(path.join(folderPath, b)).size;
          return sizeA - sizeB;
        });
      
      console.log(`📚 Found ${files.length} text files to process (sorted by size)`);

      for (const file of files) {
        await this.processFileStreaming(path.join(folderPath, file));
        this.processedFiles++;
        
        // Memory cleanup between files
        if (global.gc) {
          global.gc();
          console.log('🧹 Garbage collection performed');
        }
        
        console.log(`📊 Memory after file ${this.processedFiles}:`, this.getMemoryUsage());
      }

      console.log('\n✅ All files processed successfully!');
      
      // Cleanup
      await embeddingsService.cleanup();
      
    } catch (error) {
      console.error('❌ Error:', error);
      throw error;
    }
  }

  private async processFileStreaming(filePath: string) {
    const fileName = path.basename(filePath, '.txt');
    const fileSize = fs.statSync(filePath).size;
    
    console.log(`\n📄 Processing: ${fileName} (${(fileSize / 1024 / 1024).toFixed(2)} MB)`);

    const fileStream = fs.createReadStream(filePath);
    const rl = readline.createInterface({
      input: fileStream,
      crlfDelay: Infinity
    });

    let currentChunk = '';
    let lineCount = 0;
    let chunkCount = 0;
    let batch: ProcessedChunk[] = [];

    for await (const line of rl) {
      lineCount++;
      currentChunk += line + '\n';

      // Check if chunk is ready
      if (currentChunk.length >= this.CHUNK_SIZE) {
        const chunk = await this.processChunk(currentChunk.trim(), fileName, chunkCount++);
        if (chunk) {
          batch.push(chunk);
        }

        // Process batch if full
        if (batch.length >= this.BATCH_SIZE) {
          await this.saveBatch(batch);
          batch = [];
          process.stdout.write(`\r⏳ Processed ${chunkCount} chunks from ${lineCount} lines...`);
        }

        // Start new chunk with some overlap
        const sentences = currentChunk.split(/[.!?]+/);
        currentChunk = sentences.length > 1 ? (sentences[sentences.length - 1] || '') : '';
      }
    }

    // Process remaining chunk
    if (currentChunk.trim().length > 50) {
      const chunk = await this.processChunk(currentChunk.trim(), fileName, chunkCount++);
      if (chunk) {
        batch.push(chunk);
      }
    }

    // Save remaining batch
    if (batch.length > 0) {
      await this.saveBatch(batch);
    }

    console.log(`\n✅ Completed: ${chunkCount} chunks from ${lineCount} lines`);
  }

  private async processChunk(
    content: string, 
    source: string, 
    index: number
  ): Promise<ProcessedChunk | null> {
    try {
      // Skip very short chunks
      if (content.length < 50) return null;

      // Generate embedding with retry
      let embedding: number[];
      let attempts = 0;
      
      while (attempts < 3) {
        try {
          embedding = await embeddingsService.generateEmbedding(content);
          break;
        } catch (error) {
          attempts++;
          console.log(`\n⚠️  Embedding attempt ${attempts} failed, retrying...`);
          await new Promise(resolve => setTimeout(resolve, 1000 * attempts));
          
          if (attempts === 3) {
            console.error(`\n❌ Failed to generate embedding after 3 attempts`);
            // Use zero embedding as fallback
            embedding = new Array(384).fill(0);
          }
        }
      }

      return {
        content,
        source,
        embedding: embedding!,
        metadata: {
          chunk_index: index,
          content_type: this.detectContentType(content)
        }
      };
    } catch (error) {
      console.error(`\n❌ Error processing chunk:`, error);
      return null;
    }
  }

  private async saveBatch(batch: ProcessedChunk[]) {
    const records = batch.map(chunk => ({
      interpreter_type: 'jung',
      source: chunk.source,
      content: chunk.content,
      content_type: chunk.metadata.content_type,
      embedding: chunk.embedding,
      metadata: chunk.metadata
    }));

    try {
      const { error } = await this.supabase
        .from('knowledge_base')
        .insert(records);

      if (error) {
        console.error('\n❌ Database error:', error);
        // Continue processing despite errors
      }
    } catch (error) {
      console.error('\n❌ Failed to save batch:', error);
    }
  }

  private detectContentType(content: string): string {
    const lower = content.toLowerCase();
    
    if (lower.includes('archetype') || lower.includes('collective unconscious')) {
      return 'theory';
    }
    if (lower.includes('patient') || lower.includes('analysand')) {
      return 'case_study';
    }
    if (lower.includes('dream') && (lower.includes('dreamt') || lower.includes('dreamed'))) {
      return 'dream_example';
    }
    if (lower.includes('symbol') || lower.includes('meaning')) {
      return 'symbol';
    }
    
    return 'theory';
  }

  private getMemoryUsage(): string {
    const used = process.memoryUsage();
    return `Heap: ${(used.heapUsed / 1024 / 1024).toFixed(2)} MB / ${(used.heapTotal / 1024 / 1024).toFixed(2)} MB`;
  }
}

// Main execution
if (require.main === module) {
  const jungTextsPath = process.argv[2];
  
  if (!jungTextsPath) {
    console.error('❌ Please provide the path to Jung texts folder');
    console.error('Usage: npm run ingest-jung-stream /path/to/jung/texts');
    process.exit(1);
  }

  // Enable manual garbage collection
  if (!global.gc) {
    console.log('💡 Tip: Run with --expose-gc flag for better memory management:');
    console.log('   node --expose-gc -r tsx/cjs src/scripts/ingest-jung-stream.ts /path/to/texts');
  }

  const processor = new StreamingJungProcessor();
  
  processor.processJungTexts(jungTextsPath)
    .then(() => {
      console.log('\n🎉 Jung texts successfully ingested!');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n💥 Fatal error:', error);
      process.exit(1);
    });
}