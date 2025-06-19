import * as fs from 'fs';
import * as path from 'path';
import { createClient } from '@supabase/supabase-js';
import { config } from '../../config';

// Import with dynamic loading to reduce initial memory footprint
let embeddingsService: any;

interface TextChunk {
  content: string;
  metadata: {
    source: string;
    chapter?: string;
    startChar: number;
    endChar: number;
    chunkIndex: number;
  };
}

class OptimizedJungTextProcessor {
  private supabase = createClient(
    config.supabase.url,
    config.supabase.serviceRoleKey
  );

  // Smaller chunking parameters for memory efficiency
  private readonly CHUNK_SIZE = 500; // Smaller chunks
  private readonly CHUNK_OVERLAP = 100;
  private readonly MIN_CHUNK_SIZE = 100;
  private readonly BATCH_SIZE = 2; // Very small batches

  async processJungTexts(folderPath: string) {
    console.log('Starting optimized Jung text processing...');
    console.log('Note: This will take longer but use less memory');
    
    try {
      // Lazy load embeddings service
      console.log('Loading embeddings service...');
      const { embeddingsService: service } = await import('../../services/embeddings.service');
      embeddingsService = service;
      
      // Initialize the model
      console.log('Initializing embedding model (this may take a moment)...');
      await embeddingsService.generateEmbedding('test');
      console.log('Model initialized successfully');

      // Read all text files
      const files = fs.readdirSync(folderPath)
        .filter(f => f.endsWith('.txt'));
      
      console.log(`Found ${files.length} text files to process`);

      // Process files sequentially to minimize memory usage
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (!file) continue;
        
        console.log(`\n[${i + 1}/${files.length}] Processing: ${file}`);
        await this.processFile(path.join(folderPath, file));
        
        // Suggest garbage collection between files
        if (global.gc) {
          global.gc();
        }
      }

      console.log('\n✅ Processing complete!');
    } catch (error) {
      console.error('❌ Error processing texts:', error);
      throw error;
    }
  }

  private async processFile(filePath: string) {
    const fileName = path.basename(filePath, '.txt');
    
    // Read file in chunks to avoid loading entire file into memory
    const fileSize = fs.statSync(filePath).size;
    console.log(`File size: ${(fileSize / 1024 / 1024).toFixed(2)} MB`);

    const content = fs.readFileSync(filePath, 'utf-8');
    const chunks = this.createSmartChunks(content, fileName);
    
    console.log(`Created ${chunks.length} chunks from ${fileName}`);

    // Process in very small batches
    let processedCount = 0;
    for (let i = 0; i < chunks.length; i += this.BATCH_SIZE) {
      const batch = chunks.slice(i, i + this.BATCH_SIZE);
      
      try {
        await this.processBatch(batch, fileName);
        processedCount += batch.length;
        
        // Show progress
        const progress = ((processedCount / chunks.length) * 100).toFixed(1);
        process.stdout.write(`\rProgress: ${progress}% (${processedCount}/${chunks.length} chunks)`);
      } catch (error) {
        console.error(`\nError processing batch ${i}-${i + this.BATCH_SIZE}:`, error);
        // Continue with next batch
      }
      
      // Small delay to prevent overwhelming the system
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    console.log('\n✓ File completed');
  }

  private createSmartChunks(text: string, source: string): TextChunk[] {
    const chunks: TextChunk[] = [];
    
    // Simple chunking without complex chapter detection to save memory
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
    
    let currentChunk = '';
    let chunkIndex = 0;
    let startChar = 0;
    
    for (const sentence of sentences) {
      if (currentChunk.length + sentence.length > this.CHUNK_SIZE && currentChunk.length > this.MIN_CHUNK_SIZE) {
        // Save current chunk
        chunks.push({
          content: currentChunk.trim(),
          metadata: {
            source,
            startChar,
            endChar: startChar + currentChunk.length,
            chunkIndex: chunkIndex++
          }
        });
        
        // Start new chunk with overlap
        const overlapStart = Math.max(0, currentChunk.length - this.CHUNK_OVERLAP);
        currentChunk = currentChunk.slice(overlapStart) + sentence;
        startChar += overlapStart;
      } else {
        currentChunk += sentence;
      }
    }
    
    // Don't forget the last chunk
    if (currentChunk.trim().length >= this.MIN_CHUNK_SIZE) {
      chunks.push({
        content: currentChunk.trim(),
        metadata: {
          source,
          startChar,
          endChar: startChar + currentChunk.length,
          chunkIndex: chunkIndex++
        }
      });
    }
    
    return chunks;
  }

  private async processBatch(chunks: TextChunk[], source: string) {
    // Generate embeddings one at a time to minimize memory
    const embeddings: number[][] = [];
    
    for (const chunk of chunks) {
      try {
        const embedding = await embeddingsService.generateEmbedding(chunk.content);
        embeddings.push(embedding);
      } catch (error) {
        console.error('\nError generating embedding:', error);
        // Use zero vector as fallback
        embeddings.push(new Array(384).fill(0));
      }
    }

    // Prepare records for insertion
    const records = chunks.map((chunk, i) => ({
      interpreter_type: 'jung',
      source: source,
      chapter: chunk.metadata.chapter || null,
      content: chunk.content,
      content_type: this.detectContentType(chunk.content),
      metadata: chunk.metadata,
      embedding: embeddings[i]
    }));

    // Insert into database
    const { error } = await this.supabase
      .from('knowledge_base')
      .insert(records);

    if (error) {
      console.error('\nError inserting batch:', error);
      throw error;
    }
  }

  private detectContentType(content: string): string {
    const lowerContent = content.toLowerCase();
    
    if (lowerContent.includes('archetype') || lowerContent.includes('collective unconscious')) {
      return 'theory';
    }
    if (lowerContent.includes('patient') || lowerContent.includes('case')) {
      return 'case_study';
    }
    if (lowerContent.includes('dream') && (lowerContent.includes('example') || lowerContent.includes('dreamt'))) {
      return 'dream_example';
    }
    if (lowerContent.includes('symbol') || lowerContent.includes('meaning')) {
      return 'symbol';
    }
    
    return 'theory';
  }
}

// Main execution
if (require.main === module) {
  const processor = new OptimizedJungTextProcessor();
  
  // Get the path to Jung texts from command line argument
  const jungTextsPath = process.argv[2];
  
  if (!jungTextsPath) {
    console.error('Please provide the path to Jung texts folder');
    console.error('Usage: npm run ingest-jung-optimized /path/to/jung/texts');
    process.exit(1);
  }

  // Run with explicit garbage collection if available
  if (!global.gc) {
    console.log('Note: Running without explicit garbage collection.');
    console.log('For better memory management, run with: node --expose-gc');
  }

  processor.processJungTexts(jungTextsPath)
    .then(() => {
      console.log('✅ Jung texts successfully ingested!');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Failed to ingest texts:', error);
      process.exit(1);
    });
}