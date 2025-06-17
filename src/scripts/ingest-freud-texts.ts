import * as fs from 'fs';
import * as path from 'path';
import { createClient } from '@supabase/supabase-js';
import { config } from '../config';
import { embeddingsService } from '../services/embeddings.service';

interface FreudTextMetadata {
  filename: string;
  topic: 'dream' | 'metapsych' | 'ancillary' | 'case' | 'culture' | 'commentary';
  subtopic: string[];
}

interface FreudTextChunk {
  content: string;
  metadata: {
    source: string;
    chapter?: string;
    startChar: number;
    endChar: number;
    chunkIndex: number;
    topic: string;
    subtopic: string[];
    year?: number;
  };
}

export class FreudTextProcessor {
  private supabase = createClient(
    config.supabase.url,
    config.supabase.serviceRoleKey
  );

  // Metadata mapping for Freud texts
  private textMetadata: FreudTextMetadata[] = [
    {
      filename: "interpretation-of-dreams.txt",
      topic: "dream",
      subtopic: ["mechanism", "wish", "symbol", "condensation"]
    },
    {
      filename: "on-dreams.txt",
      topic: "dream",
      subtopic: ["summary", "teaching"]
    },
    {
      filename: "new-intro-to-psychoanalysis.txt",
      topic: "dream",
      subtopic: ["revision", "occultism"]
    },
    {
      filename: "introductory-lectures-dreams.txt",
      topic: "dream",
      subtopic: ["lecture", "didactic", "symbolism"]
    },
    {
      filename: "beyond-the-pleasure-principle.txt",
      topic: "metapsych",
      subtopic: ["trauma", "repetition", "death_drive"]
    },
    {
      filename: "inhibitions-symptoms-and-anxiety.txt",
      topic: "metapsych",
      subtopic: ["anxiety", "defence"]
    },
    {
      filename: "the-ego-and-the-id.txt",
      topic: "metapsych",
      subtopic: ["structure", "ego", "superego"]
    },
    {
      filename: "the-unconscious.txt",
      topic: "metapsych",
      subtopic: ["primary_process", "secondary_process", "repression"]
    },
    {
      filename: "three-essays-on-sexuality.txt",
      topic: "metapsych",
      subtopic: ["libido", "oedipus", "psychosexual"]
    },
    {
      filename: "jokes-and-their-relation-to-the-unconcious.txt",
      topic: "ancillary",
      subtopic: ["wit", "displacement"]
    },
    {
      filename: "psychopathology-of-everyday-life.txt",
      topic: "ancillary",
      subtopic: ["slip", "forgetting"]
    },
    {
      filename: "dora.txt",
      topic: "case",
      subtopic: ["hysteria", "adolescent", "family"]
    },
    {
      filename: "little-hans.txt",
      topic: "case",
      subtopic: ["phobia", "oedipus", "child"]
    },
    {
      filename: "rat-man.txt",
      topic: "case",
      subtopic: ["obsession", "punishment"]
    },
    {
      filename: "wolf-man.txt",
      topic: "case",
      subtopic: ["primal_scene", "regression"]
    },
    {
      filename: "moses-and-monotheism.txt",
      topic: "culture",
      subtopic: ["authority", "religion", "father"]
    },
    {
      filename: "totem-and-taboo.txt",
      topic: "culture",
      subtopic: ["tribal", "parricide"]
    },
    {
      filename: "companion.txt",
      topic: "commentary",
      subtopic: ["glossary"]
    }
  ];

  // Differentiated chunk sizes based on content type
  private getChunkingParams(topic: string): { chunkSize: number; overlap: number } {
    switch (topic) {
      case 'dream':
      case 'metapsych':
        return { chunkSize: 750, overlap: 100 };
      case 'case':
        return { chunkSize: 300, overlap: 50 };
      case 'ancillary':
        return { chunkSize: 250, overlap: 50 };
      case 'commentary':
        return { chunkSize: 120, overlap: 0 };
      default:
        return { chunkSize: 500, overlap: 100 };
    }
  }

  // Year mapping for Freud's works (approximate)
  private getPublicationYear(filename: string): number | undefined {
    const yearMap: Record<string, number> = {
      'interpretation-of-dreams.txt': 1900,
      'psychopathology-of-everyday-life.txt': 1901,
      'dora.txt': 1905,
      'three-essays-on-sexuality.txt': 1905,
      'jokes-and-their-relation-to-the-unconcious.txt': 1905,
      'little-hans.txt': 1909,
      'rat-man.txt': 1909,
      'totem-and-taboo.txt': 1913,
      'on-dreams.txt': 1901,
      'wolf-man.txt': 1918,
      'beyond-the-pleasure-principle.txt': 1920,
      'the-ego-and-the-id.txt': 1923,
      'inhibitions-symptoms-and-anxiety.txt': 1926,
      'new-intro-to-psychoanalysis.txt': 1933,
      'moses-and-monotheism.txt': 1939
    };
    return yearMap[filename];
  }

  async processFreudTexts(folderPath: string) {
    console.log('Starting Freud text processing with enhanced metadata...');
    
    try {
      // Initialize the model
      console.log('Initializing embedding model...');
      await embeddingsService.generateEmbedding('test');
      console.log('Model initialized successfully');

      // Read all text files
      const files = fs.readdirSync(folderPath)
        .filter(f => f.endsWith('.txt'));
      
      console.log(`Found ${files.length} text files to process`);

      // Process files sequentially
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (!file) continue;
        
        const metadata = this.textMetadata.find(m => m.filename === file);
        if (!metadata) {
          console.warn(`⚠️  No metadata found for ${file}, skipping...`);
          continue;
        }
        
        console.log(`\n[${i + 1}/${files.length}] Processing: ${file}`);
        console.log(`  Topic: ${metadata.topic}, Subtopics: ${metadata.subtopic.join(', ')}`);
        
        await this.processFile(path.join(folderPath, file), metadata);
        
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

  private async processFile(filePath: string, metadata: FreudTextMetadata) {
    const fileName = path.basename(filePath, '.txt');
    const fileSize = fs.statSync(filePath).size;
    console.log(`File size: ${(fileSize / 1024 / 1024).toFixed(2)} MB`);

    // Check if this source already exists in DB before processing
    const { count: existingCount } = await this.supabase
      .from('knowledge_base')
      .select('*', { count: 'exact', head: true })
      .eq('interpreter_type', 'freud')
      .eq('source', fileName);
    
    if (existingCount && existingCount > 0) {
      console.log(`⚠️  Source "${fileName}" already has ${existingCount} entries in DB`);
      console.log('   Skipping entire file to avoid duplicates...');
      return;
    }

    const content = fs.readFileSync(filePath, 'utf-8');
    const chunks = this.createSmartChunks(content, fileName, metadata);
    
    console.log(`Created ${chunks.length} chunks from ${fileName}`);

    // Process in small batches
    const BATCH_SIZE = 3;
    let processedCount = 0;
    
    for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
      const batch = chunks.slice(i, i + BATCH_SIZE);
      
      try {
        await this.processBatch(batch, fileName);
        processedCount += batch.length;
        
        // Show progress
        const progress = ((processedCount / chunks.length) * 100).toFixed(1);
        process.stdout.write(`\rProgress: ${progress}% (${processedCount}/${chunks.length} chunks)`);
      } catch (error) {
        console.error(`\nError processing batch ${i}-${i + BATCH_SIZE}:`, error);
      }
      
      // Small delay to prevent overwhelming the system
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    console.log('\n✓ File completed');
  }

  private createSmartChunks(text: string, source: string, metadata: FreudTextMetadata): FreudTextChunk[] {
    const chunks: FreudTextChunk[] = [];
    const { chunkSize, overlap } = this.getChunkingParams(metadata.topic);
    const year = this.getPublicationYear(metadata.filename);
    
    // Simple sentence-based chunking
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
    
    let currentChunk = '';
    let chunkIndex = 0;
    let startChar = 0;
    
    for (const sentence of sentences) {
      if (currentChunk.length + sentence.length > chunkSize && currentChunk.length > 100) {
        // Save current chunk
        chunks.push({
          content: currentChunk.trim(),
          metadata: {
            source,
            startChar,
            endChar: startChar + currentChunk.length,
            chunkIndex: chunkIndex++,
            topic: metadata.topic,
            subtopic: metadata.subtopic,
            ...(year !== undefined && { year })
          }
        });
        
        // Start new chunk with overlap
        const overlapStart = Math.max(0, currentChunk.length - overlap);
        currentChunk = currentChunk.slice(overlapStart) + sentence;
        startChar += overlapStart;
      } else {
        currentChunk += sentence;
      }
    }
    
    // Don't forget the last chunk
    if (currentChunk.trim().length >= 100) {
      chunks.push({
        content: currentChunk.trim(),
        metadata: {
          source,
          startChar,
          endChar: startChar + currentChunk.length,
          chunkIndex: chunkIndex++,
          topic: metadata.topic,
          subtopic: metadata.subtopic,
          ...(year !== undefined && { year })
        }
      });
    }
    
    return chunks;
  }

  private async processBatch(chunks: FreudTextChunk[], source: string) {
    // Generate embeddings one at a time
    const embeddings: number[][] = [];
    
    for (const chunk of chunks) {
      try {
        const embedding = await embeddingsService.generateEmbedding(chunk.content);
        embeddings.push(embedding);
      } catch (error) {
        console.error('\nError generating embedding:', error);
        embeddings.push(new Array(384).fill(0));
      }
    }

    // Prepare records for insertion with enhanced metadata
    const records = chunks.map((chunk, i) => ({
      interpreter_type: 'freud',
      source: source,
      chapter: chunk.metadata.chapter || null,
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
      console.error('\nError inserting batch:', error);
      throw error;
    } else {
      console.log(`\n✅ Successfully inserted ${records.length} new records`);
    }
  }

  private detectContentType(content: string, topic: string): string {
    const lowerContent = content.toLowerCase();
    
    // Topic-based content type detection
    if (topic === 'case') {
      return 'case_study';
    }
    
    if (topic === 'dream' && (lowerContent.includes('example') || lowerContent.includes('patient'))) {
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
  const processor = new FreudTextProcessor();
  
  // Get the path to Freud texts from command line argument or use default
  const freudTextsPath = process.argv[2] || path.join(__dirname, '../../RAG-data/freud');
  
  if (!fs.existsSync(freudTextsPath)) {
    console.error(`Freud texts folder not found at: ${freudTextsPath}`);
    console.error('Usage: npm run ingest-freud [/path/to/freud/texts]');
    process.exit(1);
  }

  // Run with explicit garbage collection if available
  if (!global.gc) {
    console.log('Note: Running without explicit garbage collection.');
    console.log('For better memory management, run with: node --expose-gc');
  }

  processor.processFreudTexts(freudTextsPath)
    .then(() => {
      console.log('✅ Freud texts successfully ingested with enhanced metadata!');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Failed to ingest texts:', error);
      process.exit(1);
    });
}