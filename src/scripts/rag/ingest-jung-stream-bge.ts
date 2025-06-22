#!/usr/bin/env node
import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';
import { createClient } from '@supabase/supabase-js';
import { config } from '../../config';
import { bgeEmbeddingsService } from '../../services/embeddings-bge.service';
import { improvedKnowledgeClassifier as knowledgeClassifier } from './core/knowledge-classifier-bge-improved';
import { logger } from '../../utils/logger';

interface ProcessedChunk {
  content: string;
  source: string;
  chapter?: string;
  embedding_bge: number[];
  sparse_embedding?: any;
  metadata_v2: any;
  classification: any;
}

class BGEStreamingJungProcessor {
  private supabase = createClient(
    config.supabase.url,
    config.supabase.serviceRoleKey
  );

  private readonly CHUNK_SIZE = 800; // Larger chunks for BGE-M3 (better context)
  private readonly BATCH_SIZE = 2; // Smaller batches due to larger embeddings
  private processedFiles = 0;
  private totalChunks = 0;
  private successfulChunks = 0;

  async processJungTexts(folderPath: string) {
    logger.info('🚀 Starting BGE-M3 streaming Jung text processing...');
    logger.info('📊 Memory usage:', this.getMemoryUsage());
    logger.info('🔬 Model info:', bgeEmbeddingsService.getModelInfo());
    
    try {
      // Initialize services
      logger.info('🔧 Initializing BGE-M3 and classifier...');
      
      // Test BGE-M3
      const testEmbedding = await bgeEmbeddingsService.generateFullEmbedding(
        'Test initialization for dream analysis'
      );
      logger.info('✅ BGE-M3 ready', { 
        dimensions: testEmbedding.dense.length,
        hasSparse: !!testEmbedding.sparse 
      });
      
      // Test knowledge classifier
      const testClassification = await knowledgeClassifier.classifyContent(
        'This is a test about dreams and archetypes',
        'jung'
      );
      logger.info('✅ Knowledge classifier ready', { 
        hasThemes: testClassification.applicable_themes?.length > 0 
      });

      // Update migration status
      await this.updateMigrationStatus('in_progress');

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

      // Update migration status
      await this.updateMigrationStatus('completed');

      logger.info(`\n✅ BGE-M3 ingestion complete!`);
      logger.info(`📊 Final stats:`);
      logger.info(`   - Files processed: ${this.processedFiles}`);
      logger.info(`   - Total chunks: ${this.totalChunks}`);
      logger.info(`   - Successful chunks: ${this.successfulChunks}`);
      logger.info(`   - Success rate: ${((this.successfulChunks/this.totalChunks)*100).toFixed(1)}%`);

    } catch (error) {
      logger.error('Fatal error:', error);
      await this.updateMigrationStatus('failed', error);
      throw error;
    } finally {
      // Clean up embeddings service
      await bgeEmbeddingsService.cleanup();
      logger.info('🧹 Cleaned up BGE-M3 service');
    }
  }

  private async updateMigrationStatus(status: string, error?: any) {
    try {
      const updateData: any = {
        status,
        processed_records: this.successfulChunks,
        total_records: this.totalChunks
      };

      if (status === 'completed') {
        updateData.completed_at = new Date().toISOString();
      }

      if (error) {
        updateData.error_log = { error: String(error) };
      }

      await this.supabase
        .from('embedding_migrations')
        .update(updateData)
        .eq('target_model', 'bge-m3')
        .eq('status', 'pending');
    } catch (err) {
      logger.error('Failed to update migration status:', err);
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
        if (currentChunk.trim().length > 100) {
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
    if (currentChunk.trim().length > 100) {
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
    
    return (
      /^Chapter \d+/i.test(trimmed) ||
      /^Part [IVX]+/i.test(trimmed) ||
      /^Section \d+/i.test(trimmed) ||
      /^[IVX]+\./i.test(trimmed) ||
      /^\d+\./i.test(trimmed) ||
      (trimmed.length > 5 && trimmed.length < 100 && trimmed === trimmed.toUpperCase()) ||
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
      if (content.length < 100) return null;

      // Generate BGE-M3 embeddings with retry
      let fullEmbedding: any;
      let attempts = 0;
      
      while (attempts < 3) {
        try {
          fullEmbedding = await bgeEmbeddingsService.generateFullEmbedding(content);
          break;
        } catch (error) {
          attempts++;
          logger.warn(`BGE-M3 embedding attempt ${attempts} failed, retrying...`);
          await new Promise(resolve => setTimeout(resolve, 2000 * attempts));
          
          if (attempts === 3) {
            logger.error('Failed to generate BGE-M3 embedding after 3 attempts');
            return null;
          }
        }
      }

      // Use our enhanced knowledge classifier
      const classification = await knowledgeClassifier.classifyContent(content, 'jung');

      // Prepare sparse embedding for storage
      const sparseJson = fullEmbedding.sparse 
        ? Object.fromEntries(fullEmbedding.sparse)
        : null;

      // Enhanced metadata v2
      const metadata_v2 = {
        ...classification,
        chunk_index: index,
        chapter,
        word_count: content.split(/\s+/).length,
        has_examples: /(?:for example|for instance|e\.g\.|such as)/i.test(content),
        has_quotes: /"[^"]+"/g.test(content),
        embedding_model: 'bge-m3',
        embedding_dimensions: fullEmbedding.dense.length,
        has_sparse: !!sparseJson,
        timestamp: new Date().toISOString()
      };

      return {
        content,
        source,
        chapter: chapter || undefined,
        embedding_bge: fullEmbedding.dense,
        sparse_embedding: sparseJson,
        metadata_v2,
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
      
      // BGE-M3 specific fields
      embedding_bge: chunk.embedding_bge,
      sparse_embedding: chunk.sparse_embedding,
      metadata_v2: chunk.metadata_v2,
      embedding_version: 'bge-m3',
      
      // Also populate regular fields for compatibility
      embedding: new Array(384).fill(0), // Placeholder for old embedding
      metadata: {
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
        logger.debug(`💾 Saved BGE-M3 batch of ${batch.length} chunks`);
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
    console.error('Usage: npm run ingest-jung-bge RAG-data/jung');
    process.exit(1);
  }

  const processor = new BGEStreamingJungProcessor();
  
  processor.processJungTexts(jungTextsPath)
    .then(() => {
      console.log('\n🎉 BGE-M3 Jung texts successfully ingested with full metadata!');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n❌ BGE-M3 ingestion failed:', error);
      process.exit(1);
    });
}