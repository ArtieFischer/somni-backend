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

class JungTextProcessor {
  private supabase = createClient(
    config.supabase.url,
    config.supabase.serviceRoleKey
  );

  // Chunking parameters
  private readonly CHUNK_SIZE = 800; // characters
  private readonly CHUNK_OVERLAP = 200; // overlap between chunks
  private readonly MIN_CHUNK_SIZE = 100;
  private readonly BATCH_SIZE = 5; // Process only 5 chunks at a time to avoid memory issues

  async processJungTexts(folderPath: string) {
    console.log('Starting Jung text processing...');
    
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
    const chunks = this.createSmartChunks(content, fileName);
    
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

  private createSmartChunks(text: string, source: string): TextChunk[] {
    const chunks: TextChunk[] = [];
    
    // Try to detect chapters or sections
    const chapterRegex = /(?:Chapter|CHAPTER|Part|PART)\s+(?:\d+|[IVX]+)[^\n]*/g;
    const sections = this.splitByChapters(text, chapterRegex);

    if (sections.length > 1) {
      // Process by chapters
      for (const section of sections) {
        const sectionChunks = this.createOverlappingChunks(
          section.content,
          source,
          section.chapter
        );
        chunks.push(...sectionChunks);
      }
    } else {
      // No clear chapters, chunk the whole text
      const textChunks = this.createOverlappingChunks(text, source);
      chunks.push(...textChunks);
    }

    return chunks;
  }

  private splitByChapters(text: string, regex: RegExp): Array<{chapter?: string, content: string}> {
    const matches = Array.from(text.matchAll(regex));
    
    if (matches.length === 0) {
      return [{content: text}];
    }

    const sections = [];
    for (let i = 0; i < matches.length; i++) {
      const match = matches[i];
      if (!match || match.index === undefined) continue;
      const start = match.index;
      const nextMatch = matches[i + 1];
      const end = i < matches.length - 1 && nextMatch && nextMatch.index !== undefined 
        ? nextMatch.index 
        : text.length;
      const chapter = match[0].trim();
      const content = text.slice(start, end).trim();
      
      if (content.length > this.MIN_CHUNK_SIZE) {
        sections.push({ chapter, content });
      }
    }

    return sections;
  }

  private createOverlappingChunks(
    text: string, 
    source: string, 
    chapter?: string
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
        const chunkMetadata: TextChunk['metadata'] = {
          source,
          startChar,
          endChar,
          chunkIndex: chunkIndex++
        };
        
        if (chapter) {
          chunkMetadata.chapter = chapter;
        }
        
        chunks.push({
          content,
          metadata: chunkMetadata
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
      console.error('Error inserting batch:', error);
      throw error;
    }
  }

  private detectContentType(content: string): string {
    const lowerContent = content.toLowerCase();
    
    // Simple heuristics to detect content type
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
    
    return 'theory'; // default
  }
}

// Main execution
if (require.main === module) {
  const processor = new JungTextProcessor();
  
  // Get the path to Jung texts from command line argument
  const jungTextsPath = process.argv[2];
  
  if (!jungTextsPath) {
    console.error('Please provide the path to Jung texts folder');
    console.error('Usage: npm run ingest-jung /path/to/jung/texts');
    process.exit(1);
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