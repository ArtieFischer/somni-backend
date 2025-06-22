#!/usr/bin/env node
import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';
import { createClient } from '@supabase/supabase-js';
import { config } from '../../config';
import { embeddingsService } from '../../services/embeddings.service';
import { knowledgeClassifier } from './core/knowledge-classifier';
import { logger } from '../../utils/logger';

interface ProcessedChunk {
  content: string;
  source: string;
  chapter?: string;
  embedding: number[];
  metadata: any;
  classification: any;
}

class EnhancedStreamingJungProcessor {
  private supabase = createClient(
    config.supabase.url,
    config.supabase.serviceRoleKey
  );

  private readonly CHUNK_SIZE = 600; // Slightly larger for better context
  private readonly BATCH_SIZE = 3;
  private processedFiles = 0;
  private totalChunks = 0;
  private successfulChunks = 0;

  async processJungTexts(folderPath: string) {
    logger.info('🚀 Starting enhanced streaming Jung text processing...');
    logger.info('📊 Memory usage:', this.getMemoryUsage());
    
    try {
      // Initialize services
      logger.info('🔧 Initializing services...');
      await embeddingsService.generateEmbedding('test initialization');
      
      // Test knowledge classifier
      const testClassification = await knowledgeClassifier.classifyContent(
        'This is a test about dreams and archetypes',
        'jung'
      );
      logger.info('✅ Knowledge classifier ready', { 
        hasThemes: testClassification.applicable_themes?.length > 0 
      });

      const files = fs.readdirSync(folderPath)
        .filter(f => f.endsWith('.txt'))
        .sort((a, b) => {
          const sizeA = fs.statSync(path.join(folderPath, a)).size;
          const sizeB = fs.statSync(path.join(folderPath, b)).size;
          return sizeA - sizeB;
        });
      
      logger.info(`📚 Found ${files.length} text files to process (sorted by size)`);

      for (const file of files) {
        await this.processFileStreaming(path.join(folderPath, file));
        this.processedFiles++;
        
        // Force GC after each file
        if (global.gc) {
          global.gc();
          logger.info(`🗑️  GC after file ${this.processedFiles}/${files.length}: ${this.getMemoryUsage()}`);
        }
      }

      logger.info(`\n✅ Ingestion complete!`);
      logger.info(`📊 Final stats:`);
      logger.info(`   - Files processed: ${this.processedFiles}`);
      logger.info(`   - Total chunks: ${this.totalChunks}`);
      logger.info(`   - Successful chunks: ${this.successfulChunks}`);
      logger.info(`   - Success rate: ${((this.successfulChunks/this.totalChunks)*100).toFixed(1)}%`);

    } catch (error) {
      logger.error('Fatal error:', error);
      throw error;
    } finally {
      // Clean up embeddings service
      await embeddingsService.cleanup();
      logger.info('🧹 Cleaned up embeddings service');
    }
  }

  private async processFileStreaming(filePath: string) {
    const fileName = path.basename(filePath, '.txt');
    const fileSize = fs.statSync(filePath).size;
    
    logger.info(`\n📄 Processing: ${fileName} (${(fileSize/1024/1024).toFixed(2)} MB)`);

    const fileStream = fs.createReadStream(filePath);
    const rl = readline.createInterface({
      input: fileStream,
      crlfDelay: Infinity
    });

    let currentChunk = '';
    let currentChapter = '';
    let chunkCount = 0;
    let lineCount = 0;
    let batch: ProcessedChunk[] = [];

    for await (const line of rl) {
      lineCount++;
      
      // Detect chapter headings
      if (this.isChapterHeading(line)) {
        // Save current chunk if exists
        if (currentChunk.trim().length > 50) {
          const chunk = await this.processChunk(
            currentChunk.trim(), 
            fileName, 
            currentChapter,
            chunkCount++
          );
          if (chunk) {
            batch.push(chunk);
          }
        }
        
        currentChapter = line.trim();
        currentChunk = '';
        logger.info(`   📖 New chapter: ${currentChapter}`);
        continue;
      }

      currentChunk += line + '\n';

      // Process chunk when it reaches target size
      if (currentChunk.length >= this.CHUNK_SIZE) {
        const chunk = await this.processChunk(
          currentChunk.trim(), 
          fileName,
          currentChapter, 
          chunkCount++
        );
        
        if (chunk) {
          batch.push(chunk);
        }

        // Save batch when full
        if (batch.length >= this.BATCH_SIZE) {
          await this.saveBatch(batch);
          batch = [];
          process.stdout.write(`\r   ⏳ Processed ${chunkCount} chunks from ${lineCount} lines...`);
        }

        // Smart overlap: keep last sentence for context
        const sentences = currentChunk.split(/[.!?]+/);
        currentChunk = sentences.length > 1 ? (sentences[sentences.length - 1] || '') : '';
      }
    }

    // Process remaining chunk
    if (currentChunk.trim().length > 50) {
      const chunk = await this.processChunk(
        currentChunk.trim(), 
        fileName,
        currentChapter, 
        chunkCount++
      );
      if (chunk) {
        batch.push(chunk);
      }
    }

    // Save remaining batch
    if (batch.length > 0) {
      await this.saveBatch(batch);
    }

    logger.info(`\n   ✅ Completed: ${chunkCount} chunks from ${lineCount} lines`);
    this.totalChunks += chunkCount;
  }

  private isChapterHeading(line: string): boolean {
    const trimmed = line.trim();
    
    // Common chapter patterns
    return (
      /^Chapter \d+/i.test(trimmed) ||
      /^Part [IVX]+/i.test(trimmed) ||
      /^Section \d+/i.test(trimmed) ||
      /^[IVX]+\./i.test(trimmed) ||
      /^\d+\./i.test(trimmed) ||
      // All caps titles (common in Jung texts)
      (trimmed.length > 5 && trimmed.length < 100 && trimmed === trimmed.toUpperCase()) ||
      // Numbered sections
      /^\d+\.\s+[A-Z]/.test(trimmed)
    );
  }

  private async processChunk(
    content: string, 
    source: string,
    chapter: string,
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
          logger.warn(`Embedding attempt ${attempts} failed, retrying...`);
          await new Promise(resolve => setTimeout(resolve, 1000 * attempts));
          
          if (attempts === 3) {
            logger.error('Failed to generate embedding after 3 attempts');
            // Use zero embedding as fallback
            embedding = new Array(384).fill(0);
          }
        }
      }

      // Use our enhanced knowledge classifier
      const classification = await knowledgeClassifier.classifyContent(content, 'jung');

      return {
        content,
        source,
        chapter: chapter || undefined,
        embedding: embedding!,
        metadata: {
          chunk_index: index,
          chapter,
          word_count: content.split(/\s+/).length,
          has_examples: /(?:for example|for instance|e\.g\.|such as)/i.test(content),
          has_quotes: /"[^"]+"/g.test(content),
          timestamp: new Date().toISOString()
        },
        classification
      };
    } catch (error) {
      logger.error('Error processing chunk:', error);
      return null;
    }
  }

  private async saveBatch(batch: ProcessedChunk[]) {
    const records = batch.map(chunk => ({
      interpreter_type: 'jung',
      source: chunk.source,
      chapter: chunk.chapter,
      content: chunk.content,
      content_type: chunk.classification.primary_type,
      embedding: chunk.embedding,
      metadata: {
        ...chunk.metadata,
        classification: chunk.classification,
        themes: chunk.classification.applicable_themes || [],
        concepts: chunk.classification.jungian_concepts || [],
        symbols: chunk.classification.symbols_present || [],
        confidence: chunk.classification.confidence || {}
      }
    }));

    try {
      const { error } = await this.supabase
        .from('knowledge_base')
        .insert(records);

      if (error) {
        logger.error('Database error:', error);
      } else {
        this.successfulChunks += batch.length;
        logger.debug(`💾 Saved batch of ${batch.length} chunks`);
      }
    } catch (error) {
      logger.error('Failed to save batch:', error);
    }
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
    console.error('Usage: npm run ingest-jung-stream-enhanced /path/to/jung/texts');
    process.exit(1);
  }

  // Enable manual garbage collection
  if (!global.gc) {
    console.log('💡 Running without manual GC. For better memory management, use:');
    console.log('   node --expose-gc -r tsx/cjs src/scripts/rag/ingest-jung-stream-enhanced.ts /path/to/texts');
  }

  const processor = new EnhancedStreamingJungProcessor();
  
  processor.processJungTexts(jungTextsPath)
    .then(() => {
      console.log('\n🎉 Enhanced Jung texts successfully ingested with themes!');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n❌ Ingestion failed:', error);
      process.exit(1);
    });
}