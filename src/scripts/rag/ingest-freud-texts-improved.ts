#!/usr/bin/env node
import * as fs from 'fs';
import * as path from 'path';
import { createClient } from '@supabase/supabase-js';
import { config } from '../../config';
import { embeddingsService } from '../../services/embeddings.service';

/**
 * Improved Freud text ingestion script
 * - Uses 500 character chunks like Jung (instead of 750)
 * - Proper sentence boundary handling to avoid word cutting
 * - Simplified metadata approach
 */

interface FreudChunk {
  content: string;
  metadata: {
    source: string;
    chunkIndex: number;
    topic?: string;
    subtopic?: string[];
    startChar: number;
    endChar: number;
  };
}

interface TextMetadata {
  filename: string;
  topic: string;
  subtopic: string[];
}

class ImprovedFreudTextProcessor {
  private supabase = createClient(
    config.supabase.url,
    config.supabase.serviceRoleKey
  );

  // Consistent chunk size like Jung
  private readonly CHUNK_SIZE = 500;
  private readonly CHUNK_OVERLAP = 100;
  private readonly MIN_CHUNK_SIZE = 100;

  // Simplified metadata - focus on essential categories
  private textMetadata: TextMetadata[] = [
    {
      filename: "interpretation-of-dreams.txt",
      topic: "dream",
      subtopic: ["dream_work", "wish_fulfillment", "symbolism"]
    },
    {
      filename: "on-dreams.txt",
      topic: "dream",
      subtopic: ["condensation", "displacement"]
    },
    {
      filename: "psychopathology-of-everyday-life.txt",
      topic: "everyday",
      subtopic: ["parapraxis", "slip", "forgetting"]
    },
    {
      filename: "three-essays-on-sexuality.txt",
      topic: "sexuality",
      subtopic: ["libido", "perversion", "development"]
    },
    {
      filename: "beyond-the-pleasure-principle.txt",
      topic: "metapsych",
      subtopic: ["death_drive", "repetition", "trauma"]
    },
    {
      filename: "the-ego-and-the-id.txt",
      topic: "metapsych",
      subtopic: ["ego", "id", "superego"]
    },
    {
      filename: "inhibitions-symptoms-and-anxiety.txt",
      topic: "metapsych",
      subtopic: ["anxiety", "defense", "symptom"]
    },
    {
      filename: "dora.txt",
      topic: "case",
      subtopic: ["hysteria", "dream", "transference"]
    },
    {
      filename: "little-hans.txt",
      topic: "case",
      subtopic: ["phobia", "castration", "oedipus"]
    },
    {
      filename: "rat-man.txt",
      topic: "case",
      subtopic: ["obsession", "neurosis", "guilt"]
    },
    {
      filename: "wolf-man.txt",
      topic: "case",
      subtopic: ["primal_scene", "dream", "infantile"]
    }
  ];

  async processFreudTexts(folderPath: string) {
    console.log('🔄 Starting improved Freud text processing...');
    console.log('📏 Using consistent 500-char chunks with proper sentence handling');
    
    try {
      // Initialize embedding model
      console.log('🔧 Initializing embedding model...');
      await embeddingsService.generateEmbedding('test');
      console.log('✅ Model initialized');

      // Read all text files
      const files = fs.readdirSync(folderPath)
        .filter(f => f.endsWith('.txt'));
      
      console.log(`📚 Found ${files.length} text files to process`);

      // Clear existing Freud entries (optional - comment out if appending)
      console.log('🗑️  Clearing existing Freud entries...');
      const { error: deleteError } = await this.supabase
        .from('knowledge_base')
        .delete()
        .eq('interpreter_type', 'freud');
      
      if (deleteError) {
        console.error('❌ Error clearing existing entries:', deleteError);
        throw deleteError;
      }

      // Process each file
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (!file) continue;
        
        const metadata = this.textMetadata.find(m => m.filename === file);
        if (!metadata) {
          console.warn(`⚠️  No metadata found for ${file}, using defaults`);
        }
        
        console.log(`\n[${i + 1}/${files.length}] Processing: ${file}`);
        if (metadata) {
          console.log(`  Topic: ${metadata.topic}, Subtopics: ${metadata.subtopic.join(', ')}`);
        }
        
        await this.processFile(path.join(folderPath, file), metadata);
      }

      console.log('\n✅ Processing complete!');
    } catch (error) {
      console.error('❌ Error processing texts:', error);
      throw error;
    }
  }

  private async processFile(filePath: string, metadata: TextMetadata | undefined) {
    const fileName = path.basename(filePath, '.txt');
    const fileSize = fs.statSync(filePath).size;
    console.log(`📄 File size: ${(fileSize / 1024).toFixed(2)} KB`);

    const content = fs.readFileSync(filePath, 'utf-8');
    const chunks = this.createImprovedChunks(content, fileName, metadata);
    
    console.log(`✂️  Created ${chunks.length} chunks (avg ${Math.round(content.length / chunks.length)} chars each)`);

    // Process in batches
    const BATCH_SIZE = 5;
    let processedCount = 0;
    
    for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
      const batch = chunks.slice(i, i + BATCH_SIZE);
      
      try {
        await this.processBatch(batch, fileName);
        processedCount += batch.length;
        
        // Show progress
        const progress = ((processedCount / chunks.length) * 100).toFixed(1);
        process.stdout.write(`\r⏳ Progress: ${progress}% (${processedCount}/${chunks.length} chunks)`);
      } catch (error) {
        console.error(`\n❌ Error processing batch ${i}-${i + BATCH_SIZE}:`, error);
      }
      
      // Small delay to prevent overwhelming the system
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    
    console.log('\n✅ File completed');
  }

  /**
   * Improved chunking that respects sentence boundaries
   */
  private createImprovedChunks(
    text: string, 
    source: string, 
    metadata: TextMetadata | undefined
  ): FreudChunk[] {
    const chunks: FreudChunk[] = [];
    
    // Clean and normalize text
    const cleanText = text
      .replace(/\r\n/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
    
    // Split into sentences more carefully
    const sentenceRegex = /[^.!?]+[.!?]+(?:\s+|$)/g;
    const sentences = cleanText.match(sentenceRegex) || [cleanText];
    
    let currentChunk = '';
    let chunkStartChar = 0;
    let chunkIndex = 0;
    let sentenceBuffer: string[] = [];
    
    for (let i = 0; i < sentences.length; i++) {
      const sentence = sentences[i]!.trim();
      const potentialChunk = currentChunk + (currentChunk ? ' ' : '') + sentence;
      
      // If adding this sentence would exceed chunk size
      if (potentialChunk.length > this.CHUNK_SIZE && currentChunk.length >= this.MIN_CHUNK_SIZE) {
        // Save current chunk
        chunks.push({
          content: currentChunk.trim(),
          metadata: {
            source,
            chunkIndex: chunkIndex++,
            ...(metadata?.topic && { topic: metadata.topic }),
            ...(metadata?.subtopic && { subtopic: metadata.subtopic }),
            startChar: chunkStartChar,
            endChar: chunkStartChar + currentChunk.length
          }
        });
        
        // Calculate overlap - take last few complete sentences
        const overlapSentences = this.calculateOverlapSentences(sentenceBuffer);
        
        // Start new chunk with overlap
        currentChunk = overlapSentences + (overlapSentences ? ' ' : '') + sentence;
        chunkStartChar += currentChunk.length - overlapSentences.length - sentence.length;
        sentenceBuffer = overlapSentences ? [overlapSentences, sentence] : [sentence];
      } else {
        // Add sentence to current chunk
        currentChunk = potentialChunk;
        sentenceBuffer.push(sentence);
        
        // Keep buffer size reasonable
        if (sentenceBuffer.length > 5) {
          sentenceBuffer = sentenceBuffer.slice(-5);
        }
      }
    }
    
    // Don't forget the last chunk
    if (currentChunk.trim().length >= this.MIN_CHUNK_SIZE) {
      chunks.push({
        content: currentChunk.trim(),
        metadata: {
          source,
          chunkIndex: chunkIndex++,
          ...(metadata?.topic && { topic: metadata.topic }),
          ...(metadata?.subtopic && { subtopic: metadata.subtopic }),
          startChar: chunkStartChar,
          endChar: chunkStartChar + currentChunk.length
        }
      });
    }
    
    return chunks;
  }

  /**
   * Calculate overlap from sentence buffer
   */
  private calculateOverlapSentences(sentenceBuffer: string[]): string {
    if (sentenceBuffer.length === 0) return '';
    
    let overlap = '';
    let overlapLength = 0;
    
    // Work backwards through sentences until we have ~100 chars of overlap
    for (let i = sentenceBuffer.length - 1; i >= 0 && overlapLength < this.CHUNK_OVERLAP; i--) {
      const sentence = sentenceBuffer[i]!;
      overlap = sentence + (overlap ? ' ' + overlap : '');
      overlapLength += sentence.length;
    }
    
    return overlap;
  }

  private async processBatch(chunks: FreudChunk[], source: string) {
    // Generate embeddings
    const embeddings: number[][] = [];
    
    for (const chunk of chunks) {
      try {
        const embedding = await embeddingsService.generateEmbedding(chunk.content);
        embeddings.push(embedding);
      } catch (error) {
        console.error('\n❌ Error generating embedding:', error);
        embeddings.push(new Array(384).fill(0)); // Fallback
      }
    }

    // Prepare records for insertion
    const records = chunks.map((chunk, i) => ({
      interpreter_type: 'freud',
      source: source,
      chapter: null,
      content: chunk.content,
      content_type: this.detectContentType(chunk.content, chunk.metadata.topic),
      metadata: chunk.metadata,
      embedding: embeddings[i]
    }));

    // Insert into database
    const { error } = await this.supabase
      .from('knowledge_base')
      .insert(records);

    if (error) {
      console.error('\n❌ Error inserting batch:', error);
      throw error;
    }
  }

  private detectContentType(content: string, topic?: string): string {
    const lower = content.toLowerCase();
    
    // Use topic if provided
    if (topic) {
      switch (topic) {
        case 'dream':
          return 'dream_analysis';
        case 'case':
          return 'case_study';
        case 'metapsych':
          return 'theory';
        case 'sexuality':
          return 'sexual_theory';
        case 'everyday':
          return 'everyday_psychology';
      }
    }
    
    // Fallback content detection
    if (lower.includes('dream') || lower.includes('manifest content')) {
      return 'dream_analysis';
    } else if (lower.includes('patient') || lower.includes('analysis of')) {
      return 'case_study';
    } else if (lower.includes('ego') || lower.includes('superego') || lower.includes('libido')) {
      return 'theory';
    } else {
      return 'general';
    }
  }
}

// Main execution
if (require.main === module) {
  const processor = new ImprovedFreudTextProcessor();
  const folderPath = process.argv[2];
  
  if (!folderPath) {
    console.error('❌ Please provide the path to the Freud texts folder');
    console.log('Usage: npm run ingest:freud:improved <path-to-freud-texts>');
    process.exit(1);
  }
  
  if (!fs.existsSync(folderPath)) {
    console.error('❌ Folder not found:', folderPath);
    process.exit(1);
  }
  
  processor.processFreudTexts(folderPath)
    .then(() => {
      console.log('✅ All done!');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Fatal error:', error);
      process.exit(1);
    });
}