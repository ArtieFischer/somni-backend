import * as fs from 'fs';
import * as path from 'path';
import { BookPreprocessor } from './core/preprocessor';
import { SmartChunker } from './core/chunker';
import { ContentClassifier } from './core/classifier';
import { DatabaseIngestor, ProcessedChunk } from './core/ingestor';
import { embeddingsService } from '../../services/embeddings.service';
import { logger } from '../../utils/logger';
import { ProgressTracker, SpinnerProgress } from './utils/progress';
import { getInterpreterConfig, IngestionConfig } from './config/ingestion.config';

class KnowledgeBaseIngestion {
  private preprocessor = new BookPreprocessor();
  private chunker = new SmartChunker();
  private classifier = new ContentClassifier();
  private ingestor = new DatabaseIngestor();
  private spinner = new SpinnerProgress();
  
  async ingestInterpreterData(config: IngestionConfig): Promise<void> {
    const { interpreter, dataPath } = config;
    logger.info(`Starting ingestion for ${interpreter} interpreter`);
    console.log(`\n📚 Processing ${interpreter.toUpperCase()} texts from ${dataPath}\n`);
    
    // Check if data path exists
    if (!fs.existsSync(dataPath)) {
      throw new Error(`Data path not found: ${dataPath}`);
    }
    
    const files = await fs.promises.readdir(dataPath);
    const textFiles = files.filter(f => f.endsWith('.txt'));
    
    if (textFiles.length === 0) {
      logger.warn(`No .txt files found in ${dataPath}`);
      return;
    }
    
    console.log(`Found ${textFiles.length} text files to process\n`);
    
    let totalStats = {
      books: 0,
      chunks: 0,
      failedBooks: 0
    };
    
    for (let i = 0; i < textFiles.length; i++) {
      const file = textFiles[i];
      console.log(`\n[${i + 1}/${textFiles.length}] Processing: ${file}`);
      console.log('─'.repeat(50));
      
      try {
        const stats = await this.processBook(
          path.join(dataPath, file),
          interpreter,
          config
        );
        
        totalStats.books++;
        totalStats.chunks += stats.chunks;
        
        console.log(`✓ Completed: ${stats.chunks} chunks created`);
      } catch (error) {
        totalStats.failedBooks++;
        logger.error(`Failed to process ${file}:`, error);
        console.error(`✗ Failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
      
      // Small delay between books
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    // Print final statistics
    console.log('\n' + '═'.repeat(60));
    console.log(`📊 ${interpreter.toUpperCase()} Ingestion Complete`);
    console.log('─'.repeat(60));
    console.log(`Total books processed: ${totalStats.books}`);
    console.log(`Total chunks created: ${totalStats.chunks}`);
    if (totalStats.failedBooks > 0) {
      console.log(`Failed books: ${totalStats.failedBooks}`);
    }
    console.log('═'.repeat(60) + '\n');
    
    this.ingestor.printStats();
  }
  
  private async processBook(
    filePath: string,
    interpreter: string,
    config: IngestionConfig
  ): Promise<{ chunks: number }> {
    // Preprocess book
    this.spinner.start('Reading and preprocessing book...');
    const { metadata, chapters, content } = await this.preprocessor.preprocessBook(
      filePath,
      interpreter
    );
    this.spinner.stop(`Book preprocessed: ${metadata.title}`);
    
    console.log(`  Author: ${metadata.author}`);
    if (metadata.year) console.log(`  Year: ${metadata.year}`);
    console.log(`  Chapters detected: ${chapters.length}`);
    console.log(`  Total size: ${(metadata.totalSize / 1024).toFixed(1)} KB`);
    
    // Process each chapter
    const allChunks: ProcessedChunk[] = [];
    
    console.log('\n  Chunking and classifying content...');
    const chapterProgress = new ProgressTracker(chapters.length);
    
    for (let i = 0; i < chapters.length; i++) {
      const chapter = chapters[i];
      
      // Chunk the chapter
      const chunks = this.chunker.chunkText(
        chapter.content,
        metadata.title,
        chapter.title,
        chapter.number,
        config.chunkOptions
      );
      
      // Classify and enhance each chunk
      for (const chunk of chunks) {
        const classification = this.classifier.classifyContent(chunk.content);
        
        const enhancedChunk: ProcessedChunk = {
          interpreter_type: interpreter,
          source: metadata.title,
          chapter: chapter.title,
          content: chunk.content,
          content_type: classification.primaryType,
          metadata: {
            ...chunk.metadata,
            book_metadata: {
              source_title: metadata.title,
              source_author: metadata.author,
              source_year: metadata.year,
              source_type: 'book' as const
            },
            classification: {
              topic: classification.topics[0] || 'general',
              subtopics: classification.topics.slice(1),
              keywords: classification.keywords,
              confidence_score: classification.confidence,
              has_examples: classification.hasExamples,
              has_theory: classification.primaryType === 'theory',
              has_symbols: classification.hasSymbols,
              secondary_types: classification.secondaryTypes
            },
            // Theme-based metadata
            jungian_mapping: {
              concepts: classification.jungianConcepts || [],
              applicable_themes: classification.applicableThemes || [],
              interpretive_context: classification.interpretiveContext || ''
            },
            chunk_position: {
              chapter_number: chapter.number,
              chunk_in_chapter: chunk.metadata.chunkIndex,
              total_chunks_in_chapter: chunks.length
            }
          },
          embedding: null
        };
        
        allChunks.push(enhancedChunk);
      }
      
      chapterProgress.incrementAndUpdate();
    }
    
    chapterProgress.complete();
    
    // Analyze chunks
    const chunkStats = this.chunker.analyzeChunks(
      allChunks.map(c => ({
        content: c.content,
        metadata: c.metadata
      }))
    );
    
    console.log(`\n  Chunk statistics:`);
    console.log(`    Total chunks: ${chunkStats.totalChunks}`);
    console.log(`    Avg size: ${chunkStats.avgChunkSize} chars (~${chunkStats.avgTokens} tokens)`);
    console.log(`    Size range: ${chunkStats.minChunkSize}-${chunkStats.maxChunkSize} chars`);
    
    // Generate embeddings in batches
    console.log(`\n  Generating embeddings...`);
    const embeddingProgress = new ProgressTracker(allChunks.length);
    
    for (let i = 0; i < allChunks.length; i += config.batchSize) {
      const batch = allChunks.slice(i, i + config.batchSize);
      const texts = batch.map(chunk => chunk.content);
      
      try {
        // Generate embeddings with retry logic
        let embeddings: number[][] | null = null;
        let attempts = 0;
        const maxAttempts = config.embeddingOptions?.retryAttempts || 3;
        
        while (!embeddings && attempts < maxAttempts) {
          try {
            attempts++;
            embeddings = await embeddingsService.generateEmbeddings(texts);
          } catch (error) {
            if (attempts < maxAttempts) {
              logger.warn(`Embedding generation failed (attempt ${attempts}/${maxAttempts}), retrying...`);
              await new Promise(resolve => 
                setTimeout(resolve, config.embeddingOptions?.retryDelay || 1000)
              );
            } else {
              throw error;
            }
          }
        }
        
        if (!embeddings) {
          throw new Error('Failed to generate embeddings after all attempts');
        }
        
        // Assign embeddings to chunks
        batch.forEach((chunk, idx) => {
          chunk.embedding = embeddings![idx];
        });
        
        // Insert batch into database
        await this.ingestor.insertBatch(batch);
        
        embeddingProgress.update((i + batch.length) / allChunks.length);
      } catch (error) {
        logger.error(`Failed to process batch ${i}-${i + config.batchSize}:`, error);
        // Continue with next batch
      }
      
      // Small delay to prevent overload
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    embeddingProgress.complete();
    
    // Verify ingestion
    const verification = await this.ingestor.verifyIngestion(metadata.title, interpreter);
    
    console.log(`\n  Content type distribution:`);
    Object.entries(verification.contentTypes)
      .sort(([, a], [, b]) => b - a)
      .forEach(([type, count]) => {
        const percentage = ((count / verification.totalChunks) * 100).toFixed(1);
        console.log(`    ${type}: ${count} chunks (${percentage}%)`);
      });
    
    if (Object.keys(verification.topics).length > 0) {
      console.log(`\n  Main topics:`);
      Object.entries(verification.topics)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .forEach(([topic, count]) => {
          console.log(`    ${topic}: ${count} chunks`);
        });
    }
    
    return { chunks: allChunks.length };
  }
  
  async cleanupInterpreterData(interpreter: string): Promise<void> {
    console.log(`\n🧹 Cleaning up existing ${interpreter} data...`);
    
    // Get all sources for this interpreter
    const { data: sources } = await this.ingestor['supabase']
      .from('knowledge_base')
      .select('source')
      .eq('interpreter_type', interpreter);
    
    if (!sources || sources.length === 0) {
      console.log('No existing data found.');
      return;
    }
    
    const uniqueSources = [...new Set(sources.map(s => s.source))];
    console.log(`Found ${uniqueSources.length} sources to clean up.`);
    
    for (const source of uniqueSources) {
      const count = await this.ingestor.deleteSource(source, interpreter);
      console.log(`  Deleted ${count} chunks from "${source}"`);
    }
  }
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  const interpreterArg = args.find(arg => arg.startsWith('--interpreter='));
  const cleanupArg = args.includes('--cleanup');
  const helpArg = args.includes('--help') || args.includes('-h');
  
  if (helpArg) {
    console.log(`
Knowledge Base Ingestion Tool

Usage: npm run ingest-knowledge [options]

Options:
  --interpreter=<name>  Process specific interpreter (jung, freud, mary, lakshmi)
  --cleanup            Delete existing data before ingestion
  --help, -h          Show this help message

Examples:
  npm run ingest-knowledge --interpreter=jung
  npm run ingest-knowledge --interpreter=freud --cleanup
  npm run ingest-knowledge  # Process all interpreters
`);
    process.exit(0);
  }
  
  const ingestion = new KnowledgeBaseIngestion();
  const basePath = process.cwd();
  
  // Determine which interpreters to process
  const interpreters = interpreterArg 
    ? [interpreterArg.split('=')[1]]
    : ['jung', 'freud', 'mary', 'lakshmi'];
  
  console.log('🚀 Knowledge Base Ingestion System');
  console.log('═'.repeat(60));
  console.log(`Base path: ${basePath}`);
  console.log(`Interpreters to process: ${interpreters.join(', ')}`);
  console.log(`Cleanup mode: ${cleanupArg ? 'Yes' : 'No'}`);
  console.log('═'.repeat(60));
  
  for (const interpreter of interpreters) {
    try {
      const config = getInterpreterConfig(interpreter, basePath);
      
      // Cleanup if requested
      if (cleanupArg) {
        await ingestion.cleanupInterpreterData(interpreter);
      }
      
      // Process interpreter data
      await ingestion.ingestInterpreterData(config);
      
      // Clean up memory between interpreters
      if (global.gc) {
        global.gc();
        logger.info('Garbage collection performed');
      }
      
      // Delay between interpreters
      if (interpreters.indexOf(interpreter) < interpreters.length - 1) {
        console.log('\nWaiting before processing next interpreter...\n');
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    } catch (error) {
      logger.error(`Failed to process ${interpreter}:`, error);
      console.error(`\n❌ Failed to process ${interpreter}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      
      // Ask if should continue
      if (interpreters.indexOf(interpreter) < interpreters.length - 1) {
        console.log('\nContinuing with next interpreter...\n');
      }
    }
  }
  
  console.log('\n✅ All ingestion complete!');
  
  // Cleanup embeddings service
  await embeddingsService.cleanup();
}

// Run if executed directly
if (require.main === module) {
  main().catch(error => {
    logger.error('Fatal error:', error);
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  });
}

export { KnowledgeBaseIngestion };