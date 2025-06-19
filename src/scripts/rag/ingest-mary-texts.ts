import * as fs from 'fs';
import * as path from 'path';
import { createClient } from '@supabase/supabase-js';
import { config } from '../../config';
import { embeddingsService } from '../../services/embeddings.service';

interface NeuroscienceTextMetadata {
  filename: string;
  topic: 'neuroscience';
  subtopic: string[];
  year?: number;
}

interface NeuroscienceTextChunk {
  content: string;
  metadata: {
    source: string;
    chapter?: string | undefined;
    startChar: number;
    endChar: number;
    chunkIndex: number;
    topic: string;
    subtopic: string[];
    year?: number | undefined;
  };
}

export class NeuroscienceTextProcessor {
  private supabase = createClient(
    config.supabase.url,
    config.supabase.serviceRoleKey
  );

  // Metadata mapping for neuroscience texts
  private textMetadata: NeuroscienceTextMetadata[] = [
    {
      filename: "The-Committee-of-Sleep.txt",
      topic: "neuroscience",
      subtopic: ["creativity", "problem_solving", "rem", "dream_function", "insight"],
      year: 2001
    },
    {
      filename: "This-Is-Why-You-Dream.txt",
      topic: "neuroscience",
      subtopic: ["neural_activity", "brain_networks", "dream_generation", "function"],
      year: 2024
    },
    {
      filename: "dreaming-and-brain.txt",
      topic: "neuroscience",
      subtopic: ["neural_mechanisms", "brain_regions", "neurotransmitters", "sleep_stages"]
    },
    {
      filename: "neuroscience-of-sleep-and-dream.txt",
      topic: "neuroscience",
      subtopic: ["sleep_architecture", "circadian", "memory", "consolidation", "brain_waves"]
    },
    {
      filename: "twenty-four-hour-mind.txt",
      topic: "neuroscience",
      subtopic: ["circadian_rhythms", "sleep_disorders", "emotion", "regulation", "memory"],
      year: 2011
    },
    {
      filename: "when-brain-dreams.txt",
      topic: "neuroscience",
      subtopic: ["consciousness", "awareness", "neural_correlates", "rem", "nrem"],
      year: 2019
    }
  ];

  async processAllTexts() {
    console.log('Starting neuroscience text processing...');
    
    for (const metadata of this.textMetadata) {
      try {
        await this.processText(metadata);
      } catch (error) {
        console.error(`Failed to process ${metadata.filename}:`, error);
      }
    }
    
    console.log('Neuroscience text processing complete');
  }

  private async processText(metadata: NeuroscienceTextMetadata) {
    const filePath = path.join(__dirname, '../../../RAG-data/neurocognitive', metadata.filename);
    
    if (!fs.existsSync(filePath)) {
      console.warn(`File not found: ${filePath}`);
      return;
    }
    
    console.log(`Processing ${metadata.filename}...`);
    
    const text = fs.readFileSync(filePath, 'utf-8');
    const chunks = this.createChunks(text, metadata);
    
    console.log(`Created ${chunks.length} chunks for ${metadata.filename}`);
    
    // Process chunks in batches
    const batchSize = 5; // Reduced to match Jung's approach
    for (let i = 0; i < chunks.length; i += batchSize) {
      const batch = chunks.slice(i, i + batchSize);
      await this.processBatch(batch, metadata.filename);
      console.log(`Processed ${Math.min(i + batchSize, chunks.length)}/${chunks.length} chunks`);
      
      // Force garbage collection hint
      if (global.gc) {
        global.gc();
      }
    }
    
    console.log(`✓ Completed ${metadata.filename}`);
  }

  private createChunks(text: string, metadata: NeuroscienceTextMetadata): NeuroscienceTextChunk[] {
    const chunks: NeuroscienceTextChunk[] = [];
    
    // Split by chapters if present
    const chapterRegex = /^(Chapter \d+[^\n]*|CHAPTER \d+[^\n]*|Part \d+[^\n]*)/gm;
    const chapters = text.split(chapterRegex);
    
    if (chapters.length > 1) {
      // Process by chapters
      for (let i = 1; i < chapters.length; i += 2) {
        const chapterTitle = chapters[i]?.trim() || '';
        const chapterContent = chapters[i + 1] || '';
        
        if (chapterContent.trim()) {
          this.createChunksFromSection(
            chapterContent,
            metadata,
            chapterTitle,
            chunks
          );
        }
      }
    } else {
      // No chapters, chunk the entire text
      this.createChunksFromSection(text, metadata, undefined, chunks);
    }
    
    return chunks;
  }

  private createChunksFromSection(
    text: string,
    metadata: NeuroscienceTextMetadata,
    chapter: string | undefined,
    chunks: NeuroscienceTextChunk[]
  ) {
    // Target chunk size with overlap
    const targetSize = 1500;
    const overlap = 200;
    const minChunkSize = 500;
    
    // Split into paragraphs
    const paragraphs = text.split(/\n\n+/).filter(p => p.trim().length > 50);
    
    let currentChunk = '';
    let startChar = 0;
    
    for (const paragraph of paragraphs) {
      if (currentChunk.length + paragraph.length > targetSize && currentChunk.length > minChunkSize) {
        // Find the best break point at a sentence boundary
        let finalContent = currentChunk.trim();
        
        // Look for sentence boundaries (. ! ?) at the end of the chunk
        const sentenceEndRegex = /[.!?]\s*$/;
        if (!sentenceEndRegex.test(finalContent)) {
          // If chunk doesn't end with sentence, find the last complete sentence
          const lastSentenceRegex = /[.!?]\s+(?=[A-Z])/g;
          const matches = Array.from(finalContent.matchAll(lastSentenceRegex));
          
          if (matches.length > 0) {
            const lastMatch = matches[matches.length - 1];
            if (lastMatch && lastMatch.index !== undefined) {
              const cutPoint = lastMatch.index + lastMatch[0].length;
              
              // Only cut if we're not losing too much content
              if (cutPoint > finalContent.length * 0.7) {
                finalContent = finalContent.substring(0, cutPoint).trim();
              }
            }
          }
        }
        
        // Save current chunk
        chunks.push({
          content: finalContent,
          metadata: {
            source: metadata.filename.replace('.txt', '').replace(/-/g, ' '),
            chapter,
            startChar,
            endChar: startChar + finalContent.length,
            chunkIndex: chunks.length,
            topic: metadata.topic,
            subtopic: metadata.subtopic,
            year: metadata.year
          }
        });
        
        // Create overlap starting from a sentence boundary
        let overlapText = '';
        const overlapStart = Math.max(0, finalContent.length - overlap);
        const potentialOverlap = finalContent.substring(overlapStart);
        
        // Find first sentence start in the overlap region
        const sentenceStartMatch = potentialOverlap.match(/(?:^|[.!?]\s+)([A-Z])/);
        if (sentenceStartMatch && sentenceStartMatch.index !== undefined) {
          overlapText = potentialOverlap.substring(sentenceStartMatch.index);
        } else {
          overlapText = potentialOverlap;
        }
        
        currentChunk = overlapText + '\n\n' + paragraph;
        startChar = startChar + finalContent.length - overlapText.length;
      } else {
        currentChunk += (currentChunk ? '\n\n' : '') + paragraph;
      }
    }
    
    // Don't forget the last chunk
    if (currentChunk.trim()) {
      chunks.push({
        content: currentChunk.trim(),
        metadata: {
          source: metadata.filename.replace('.txt', '').replace(/-/g, ' '),
          chapter,
          startChar,
          endChar: startChar + currentChunk.length,
          chunkIndex: chunks.length,
          topic: metadata.topic,
          subtopic: metadata.subtopic,
          year: metadata.year
        }
      });
    }
  }

  private async processBatch(chunks: NeuroscienceTextChunk[], filename: string) {
    try {
      // Generate embeddings for all chunks in the batch using the batch method
      const texts = chunks.map(c => c.content);
      const embeddings = await embeddingsService.generateEmbeddings(texts);
      
      // Prepare data for insertion into knowledge_base
      const documents = chunks.map((chunk, index) => ({
        interpreter_type: 'mary',
        source: chunk.metadata.source,
        chapter: chunk.metadata.chapter || null,
        content: chunk.content,
        content_type: 'theory', // neuroscience texts are theoretical
        metadata: {
          ...chunk.metadata,
          interpreter: 'mary' // ensure interpreter is set in metadata too
        },
        embedding: embeddings[index]
      }));
      
      // Insert into database
      const { error } = await this.supabase
        .from('knowledge_base')
        .insert(documents);
      
      if (error) {
        console.error(`Error inserting batch for ${filename}:`, error);
        throw error;
      }
      
    } catch (error) {
      console.error(`Failed to process batch for ${filename}:`, error);
      throw error;
    }
  }

  // Additional method to verify ingested data
  async verifyIngestion() {
    console.log('\nVerifying neuroscience text ingestion...');
    
    for (const metadata of this.textMetadata) {
      const { data, error } = await this.supabase
        .from('knowledge_base')
        .select('id, metadata, source')
        .eq('interpreter_type', 'mary')
        .eq('metadata->>topic', 'neuroscience')
        .ilike('source', `%${metadata.filename.replace('.txt', '').replace(/-/g, ' ')}%`)
        .limit(5);
      
      if (error) {
        console.error(`Error verifying ${metadata.filename}:`, error);
      } else {
        console.log(`${metadata.filename}: ${data?.length || 0} chunks found`);
      }
    }
  }
}

// Main execution
if (require.main === module) {
  const processor = new NeuroscienceTextProcessor();
  
  processor.processAllTexts()
    .then(() => processor.verifyIngestion())
    .then(() => {
      console.log('\n✅ Neuroscience text ingestion complete');
      process.exit(0);
    })
    .catch(error => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}