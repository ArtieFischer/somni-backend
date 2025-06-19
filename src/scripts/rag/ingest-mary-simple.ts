import * as fs from 'fs';
import * as path from 'path';
import { createClient } from '@supabase/supabase-js';
import { embeddingsService } from '../../services/embeddings.service';
import { config } from '../../config';

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

class MaryTextProcessor {
  private supabase = createClient(
    config.supabase.url,
    config.supabase.serviceRoleKey
  );

  // Chunking parameters
  private readonly CHUNK_SIZE = 800; // characters
  private readonly CHUNK_OVERLAP = 200; // overlap between chunks
  private readonly MIN_CHUNK_SIZE = 100;
  private readonly BATCH_SIZE = 5; // Process only 5 chunks at a time to avoid memory issues

  async processMaryTexts(folderPath: string) {
    console.log('Starting Mary text processing...');
    
    try {
      // Read all text files
      const files = fs.readdirSync(folderPath)
        .filter(f => f.endsWith('.txt'));
      
      console.log(`Found ${files.length} text files to process`);

      for (const file of files) {
        await this.processFile(path.join(folderPath, file));
      }

      console.log('Processing complete!');
    } catch (error) {
      console.error('Error processing texts:', error);
      throw error;
    }
  }

  private async processFile(filePath: string) {
    const fileName = path.basename(filePath, '.txt');
    console.log(`\nProcessing: ${fileName}`);

    const content = fs.readFileSync(filePath, 'utf-8');
    const chunks = this.createOverlappingChunks(content, fileName);
    
    console.log(`Created ${chunks.length} chunks from ${fileName}`);

    // Process in smaller batches to avoid memory issues
    for (let i = 0; i < chunks.length; i += this.BATCH_SIZE) {
      const batch = chunks.slice(i, i + this.BATCH_SIZE);
      await this.processBatch(batch, fileName);
      console.log(`Processed ${Math.min(i + this.BATCH_SIZE, chunks.length)}/${chunks.length} chunks`);
      
      // Force garbage collection hint
      if (global.gc) {
        global.gc();
      }
    }
  }

  private createOverlappingChunks(
    text: string, 
    source: string
  ): TextChunk[] {
    const chunks: TextChunk[] = [];
    let startChar = 0;
    let chunkIndex = 0;

    while (startChar < text.length) {
      // Find the end of the chunk
      let endChar = Math.min(startChar + this.CHUNK_SIZE, text.length);
      
      // Try to break at sentence boundary
      if (endChar < text.length) {
        const lastPeriod = text.lastIndexOf('.', endChar);
        const lastNewline = text.lastIndexOf('\n', endChar);
        const breakPoint = Math.max(lastPeriod, lastNewline);
        
        if (breakPoint > startChar + this.MIN_CHUNK_SIZE) {
          endChar = breakPoint + 1;
        }
      }

      const content = text.slice(startChar, endChar).trim();
      
      if (content.length >= this.MIN_CHUNK_SIZE) {
        chunks.push({
          content,
          metadata: {
            source,
            startChar,
            endChar,
            chunkIndex: chunkIndex++
          }
        });
      }

      // Move start position with overlap
      startChar = endChar - this.CHUNK_OVERLAP;
    }

    return chunks;
  }

  private async processBatch(chunks: TextChunk[], source: string) {
    // Generate embeddings for all chunks in the batch
    const texts = chunks.map(c => c.content);
    const embeddings = await embeddingsService.generateEmbeddings(texts);

    // Prepare records for insertion
    const records = chunks.map((chunk, i) => ({
      interpreter_type: 'mary',
      source: source,
      chapter: chunk.metadata.chapter || null,
      content: chunk.content,
      content_type: 'theory',
      metadata: chunk.metadata,
      embedding: embeddings[i]
    }));

    // Insert into database
    const { error } = await this.supabase
      .from('knowledge_base')
      .insert(records);

    if (error) {
      console.error('Error inserting batch:', error);
      throw error;
    }
  }
}

// Main execution
if (require.main === module) {
  const processor = new MaryTextProcessor();
  
  // Get the path to Mary texts from command line argument
  const maryTextsPath = process.argv[2] || path.join(__dirname, '../../../RAG-data/neurocognitive');
  
  if (!fs.existsSync(maryTextsPath)) {
    console.error('Mary texts folder not found:', maryTextsPath);
    process.exit(1);
  }

  processor.processMaryTexts(maryTextsPath)
    .then(() => {
      console.log('✅ Mary texts successfully ingested!');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Failed to ingest texts:', error);
      process.exit(1);
    });
}