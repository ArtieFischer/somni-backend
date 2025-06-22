# Knowledge Base Implementation Guide

## Overview
This guide provides step-by-step implementation details for the knowledge base ingestion system.

## Directory Structure
```
src/scripts/rag/
├── core/
│   ├── preprocessor.ts       # Book preprocessing logic
│   ├── chunker.ts           # Smart chunking algorithms
│   ├── classifier.ts        # Content classification
│   ├── embeddings.ts        # Embedding generation wrapper
│   └── ingestor.ts          # Database ingestion logic
├── interpreters/
│   ├── jung.ts              # Jung-specific configuration
│   ├── freud.ts             # Freud-specific configuration
│   ├── mary.ts              # Mary-specific configuration
│   └── lakshmi.ts           # Lakshmi-specific configuration
├── utils/
│   ├── logger.ts            # Logging utilities
│   ├── progress.ts          # Progress tracking
│   └── validation.ts        # Data validation
├── config/
│   └── ingestion.config.ts  # Configuration settings
└── ingest-all.ts            # Main ingestion script
```

## Core Components Implementation

### 1. Book Preprocessor (`core/preprocessor.ts`)
```typescript
import * as fs from 'fs';
import * as path from 'path';

interface BookMetadata {
  title: string;
  author: string;
  year?: number;
  interpreter: string;
  filename: string;
  totalSize: number;
  estimatedChunks: number;
}

interface Chapter {
  title: string;
  number: number;
  content: string;
  startPos: number;
  endPos: number;
}

export class BookPreprocessor {
  private readonly bookMetadataMap: Record<string, Partial<BookMetadata>> = {
    // Jung books
    'archetypes.txt': {
      title: 'The Archetypes and the Collective Unconscious',
      author: 'Carl Jung',
      year: 1969
    },
    'dreams.txt': {
      title: 'Dreams',
      author: 'Carl Jung',
      year: 1974
    },
    'man-and-his-symbols.txt': {
      title: 'Man and His Symbols',
      author: 'Carl Jung',
      year: 1964
    },
    'memories-dreams-reflections.txt': {
      title: 'Memories, Dreams, Reflections',
      author: 'Carl Jung',
      year: 1963
    },
    // Add more books...
  };

  async preprocessBook(filePath: string, interpreter: string): Promise<{
    metadata: BookMetadata;
    chapters: Chapter[];
    content: string;
  }> {
    const filename = path.basename(filePath);
    const content = await fs.promises.readFile(filePath, 'utf-8');
    
    // Extract metadata
    const metadata = this.extractBookMetadata(filename, content, interpreter);
    
    // Normalize text
    const normalizedContent = this.normalizeText(content);
    
    // Detect chapters
    const chapters = this.detectChapters(normalizedContent);
    
    return { metadata, chapters, content: normalizedContent };
  }

  private extractBookMetadata(
    filename: string, 
    content: string, 
    interpreter: string
  ): BookMetadata {
    const knownMetadata = this.bookMetadataMap[filename] || {};
    
    return {
      title: knownMetadata.title || this.extractTitleFromContent(content) || filename,
      author: knownMetadata.author || this.getAuthorForInterpreter(interpreter),
      year: knownMetadata.year,
      interpreter,
      filename,
      totalSize: content.length,
      estimatedChunks: Math.ceil(content.length / 3000) // Rough estimate
    };
  }

  private normalizeText(text: string): string {
    return text
      // Remove excessive whitespace
      .replace(/\s+/g, ' ')
      // Fix common OCR errors
      .replace(/\bl\b/g, 'I')
      .replace(/\b0\b/g, 'O')
      // Remove page numbers and headers
      .replace(/^\d+\s*$/gm, '')
      .replace(/^Chapter\s+\d+.*$/gmi, (match) => `\n${match}\n`)
      // Ensure proper spacing after periods
      .replace(/\.(\w)/g, '. $1')
      .trim();
  }

  private detectChapters(content: string): Chapter[] {
    const chapters: Chapter[] = [];
    
    // Common chapter patterns
    const chapterPatterns = [
      /^Chapter\s+(\d+)[\s:.-]*(.*)$/mi,
      /^(\d+)\.\s+(.*)$/m,
      /^Part\s+(\w+)[\s:.-]*(.*)$/mi
    ];
    
    let lastPos = 0;
    let chapterNumber = 0;
    
    for (const pattern of chapterPatterns) {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        if (match.index > lastPos) {
          chapters.push({
            title: match[2]?.trim() || `Chapter ${match[1]}`,
            number: ++chapterNumber,
            content: content.substring(lastPos, match.index),
            startPos: lastPos,
            endPos: match.index
          });
          lastPos = match.index;
        }
      }
    }
    
    // Add remaining content as final chapter
    if (lastPos < content.length) {
      chapters.push({
        title: chapters.length > 0 ? 'Appendix' : 'Full Text',
        number: ++chapterNumber,
        content: content.substring(lastPos),
        startPos: lastPos,
        endPos: content.length
      });
    }
    
    return chapters;
  }

  private extractTitleFromContent(content: string): string | null {
    // Try to extract title from first few lines
    const lines = content.split('\n').slice(0, 10);
    for (const line of lines) {
      if (line.length > 10 && line.length < 100 && /[A-Z]/.test(line)) {
        return line.trim();
      }
    }
    return null;
  }

  private getAuthorForInterpreter(interpreter: string): string {
    const authorMap: Record<string, string> = {
      'jung': 'Carl Jung',
      'freud': 'Sigmund Freud',
      'mary': 'Various Neuroscientists',
      'lakshmi': 'Various Spiritual Teachers'
    };
    return authorMap[interpreter] || 'Unknown';
  }
}
```

### 2. Smart Chunker (`core/chunker.ts`)
```typescript
interface Chunk {
  content: string;
  metadata: {
    source: string;
    chapter?: string;
    chapterNumber?: number;
    chunkIndex: number;
    totalChunks?: number;
    startChar: number;
    endChar: number;
    tokens?: number;
  };
}

interface ChunkOptions {
  targetSize: number;
  overlapSize: number;
  respectParagraphs: boolean;
  respectSentences: boolean;
  maxSize: number;
  minSize: number;
}

export class SmartChunker {
  private readonly defaultOptions: ChunkOptions = {
    targetSize: 1000,      // Target ~1000 characters
    overlapSize: 200,      // 200 character overlap
    respectParagraphs: true,
    respectSentences: true,
    maxSize: 1500,
    minSize: 300
  };

  chunkText(
    text: string, 
    source: string,
    chapter?: string,
    options?: Partial<ChunkOptions>
  ): Chunk[] {
    const opts = { ...this.defaultOptions, ...options };
    const chunks: Chunk[] = [];
    
    // Split into paragraphs first
    const paragraphs = this.splitIntoParagraphs(text);
    
    let currentChunk = '';
    let chunkIndex = 0;
    let startChar = 0;
    
    for (const paragraph of paragraphs) {
      // If adding this paragraph exceeds target size
      if (currentChunk.length + paragraph.length > opts.targetSize && 
          currentChunk.length >= opts.minSize) {
        
        // Save current chunk
        chunks.push(this.createChunk(
          currentChunk,
          source,
          chapter,
          chunkIndex++,
          startChar,
          startChar + currentChunk.length
        ));
        
        // Start new chunk with overlap
        const overlap = this.createOverlap(currentChunk, opts.overlapSize);
        currentChunk = overlap + paragraph;
        startChar = startChar + currentChunk.length - overlap.length;
      } else if (currentChunk.length + paragraph.length > opts.maxSize) {
        // Force split if exceeding max size
        const sentences = this.splitIntoSentences(paragraph);
        
        for (const sentence of sentences) {
          if (currentChunk.length + sentence.length > opts.maxSize) {
            chunks.push(this.createChunk(
              currentChunk,
              source,
              chapter,
              chunkIndex++,
              startChar,
              startChar + currentChunk.length
            ));
            
            const overlap = this.createOverlap(currentChunk, opts.overlapSize);
            currentChunk = overlap + sentence;
            startChar = startChar + currentChunk.length - overlap.length;
          } else {
            currentChunk += sentence;
          }
        }
      } else {
        currentChunk += paragraph;
      }
    }
    
    // Don't forget the last chunk
    if (currentChunk.trim().length >= opts.minSize) {
      chunks.push(this.createChunk(
        currentChunk,
        source,
        chapter,
        chunkIndex++,
        startChar,
        startChar + currentChunk.length
      ));
    }
    
    // Add total chunks count
    chunks.forEach(chunk => {
      chunk.metadata.totalChunks = chunks.length;
    });
    
    return chunks;
  }

  private splitIntoParagraphs(text: string): string[] {
    return text
      .split(/\n\n+/)
      .map(p => p.trim())
      .filter(p => p.length > 0)
      .map(p => p + '\n\n');
  }

  private splitIntoSentences(text: string): string[] {
    // Improved sentence splitting
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
    return sentences.map(s => s.trim() + ' ');
  }

  private createOverlap(text: string, overlapSize: number): string {
    if (text.length <= overlapSize) {
      return text;
    }
    
    // Try to find a sentence boundary for overlap
    const overlapStart = text.length - overlapSize;
    const overlapText = text.substring(overlapStart);
    
    const sentenceStart = overlapText.search(/[.!?]\s+[A-Z]/);
    if (sentenceStart > 0 && sentenceStart < overlapSize / 2) {
      return overlapText.substring(sentenceStart + 1).trim() + ' ';
    }
    
    return overlapText;
  }

  private createChunk(
    content: string,
    source: string,
    chapter: string | undefined,
    chunkIndex: number,
    startChar: number,
    endChar: number
  ): Chunk {
    return {
      content: content.trim(),
      metadata: {
        source,
        chapter,
        chunkIndex,
        startChar,
        endChar,
        tokens: this.estimateTokens(content)
      }
    };
  }

  private estimateTokens(text: string): number {
    // Rough estimation: ~4 characters per token
    return Math.ceil(text.length / 4);
  }
}
```

### 3. Content Classifier (`core/classifier.ts`)
```typescript
export type ContentType = 
  | 'theory'
  | 'symbol'
  | 'case_study'
  | 'dream_example'
  | 'technique'
  | 'definition'
  | 'biography'
  | 'methodology'
  | 'practice';

interface ClassificationResult {
  primaryType: ContentType;
  confidence: number;
  secondaryTypes: ContentType[];
  topics: string[];
  keywords: string[];
  hasSymbols: boolean;
  hasExamples: boolean;
  hasCaseStudy: boolean;
  hasExercise: boolean;
}

export class ContentClassifier {
  private readonly contentPatterns: Record<ContentType, RegExp[]> = {
    theory: [
      /theoretical framework/i,
      /hypothesis/i,
      /principle of/i,
      /concept of/i,
      /theory suggests/i
    ],
    symbol: [
      /symbol(izes?|ic)/i,
      /represents?/i,
      /archetype/i,
      /meaning of/i,
      /signifies?/i
    ],
    case_study: [
      /patient/i,
      /case study/i,
      /clinical/i,
      /session/i,
      /therapy/i
    ],
    dream_example: [
      /dreamt?/i,
      /in (the|my|her|his) dream/i,
      /dream(ed|ing) (of|about)/i,
      /nightmare/i
    ],
    technique: [
      /technique/i,
      /method/i,
      /approach/i,
      /practice/i,
      /exercise/i
    ],
    definition: [
      /defined? as/i,
      /meaning/i,
      /refers? to/i,
      /is called/i
    ],
    biography: [
      /was born/i,
      /life/i,
      /childhood/i,
      /personal/i
    ],
    methodology: [
      /research/i,
      /study/i,
      /experiment/i,
      /data/i,
      /findings?/i
    ],
    practice: [
      /meditation/i,
      /visualization/i,
      /breathing/i,
      /ritual/i,
      /ceremony/i
    ]
  };

  private readonly topicKeywords: Record<string, string[]> = {
    'archetypes': ['archetype', 'shadow', 'anima', 'animus', 'self', 'persona'],
    'unconscious': ['unconscious', 'subconscious', 'repression', 'collective'],
    'dreams': ['dream', 'nightmare', 'rem', 'sleep', 'lucid'],
    'symbols': ['symbol', 'symbolism', 'meaning', 'interpretation'],
    'therapy': ['therapy', 'analysis', 'treatment', 'session', 'patient'],
    'neuroscience': ['brain', 'neural', 'cortex', 'neuron', 'cognitive'],
    'spirituality': ['spiritual', 'meditation', 'consciousness', 'enlightenment']
  };

  classifyContent(text: string): ClassificationResult {
    const lowerText = text.toLowerCase();
    const scores: Record<ContentType, number> = {} as any;
    
    // Calculate scores for each content type
    for (const [type, patterns] of Object.entries(this.contentPatterns)) {
      scores[type as ContentType] = patterns.reduce((score, pattern) => {
        const matches = lowerText.match(pattern);
        return score + (matches ? matches.length : 0);
      }, 0);
    }
    
    // Find primary type
    const sortedTypes = Object.entries(scores)
      .sort(([, a], [, b]) => b - a) as [ContentType, number][];
    
    const primaryType = sortedTypes[0][0];
    const primaryScore = sortedTypes[0][1];
    const totalScore = Object.values(scores).reduce((a, b) => a + b, 0);
    
    // Extract topics
    const topics = this.extractTopics(text);
    
    // Extract keywords
    const keywords = this.extractKeywords(text);
    
    // Detect special content
    const specialContent = this.detectSpecialContent(text);
    
    return {
      primaryType,
      confidence: totalScore > 0 ? primaryScore / totalScore : 0,
      secondaryTypes: sortedTypes
        .slice(1)
        .filter(([, score]) => score > 0)
        .map(([type]) => type),
      topics,
      keywords,
      ...specialContent
    };
  }

  private extractTopics(text: string): string[] {
    const lowerText = text.toLowerCase();
    const foundTopics: string[] = [];
    
    for (const [topic, keywords] of Object.entries(this.topicKeywords)) {
      const topicScore = keywords.reduce((score, keyword) => {
        return score + (lowerText.includes(keyword) ? 1 : 0);
      }, 0);
      
      if (topicScore >= 2) {
        foundTopics.push(topic);
      }
    }
    
    return foundTopics;
  }

  private extractKeywords(text: string): string[] {
    // Extract capitalized phrases and important terms
    const keywords = new Set<string>();
    
    // Find capitalized phrases
    const capitalizedPhrases = text.match(/[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*/g) || [];
    capitalizedPhrases.forEach(phrase => {
      if (phrase.length > 3 && !phrase.match(/^(The|And|But|For|With)$/)) {
        keywords.add(phrase.toLowerCase());
      }
    });
    
    // Find terms in quotes
    const quotedTerms = text.match(/"([^"]+)"/g) || [];
    quotedTerms.forEach(term => {
      const cleaned = term.replace(/"/g, '').toLowerCase();
      if (cleaned.length > 3) {
        keywords.add(cleaned);
      }
    });
    
    return Array.from(keywords).slice(0, 10);
  }

  private detectSpecialContent(text: string): {
    hasSymbols: boolean;
    hasExamples: boolean;
    hasCaseStudy: boolean;
    hasExercise: boolean;
  } {
    const lowerText = text.toLowerCase();
    
    return {
      hasSymbols: /symbol|archetype|represents?|signifies?/i.test(text),
      hasExamples: /for example|for instance|such as|like/i.test(text),
      hasCaseStudy: /patient|case|clinical|therapy session/i.test(text),
      hasExercise: /exercise|practice|try this|meditation|technique/i.test(text)
    };
  }
}
```

### 4. Main Ingestion Script (`ingest-all.ts`)
```typescript
import { BookPreprocessor } from './core/preprocessor';
import { SmartChunker } from './core/chunker';
import { ContentClassifier } from './core/classifier';
import { DatabaseIngestor } from './core/ingestor';
import { embeddingsService } from '../../services/embeddings.service';
import { logger } from './utils/logger';
import { ProgressTracker } from './utils/progress';
import * as path from 'path';
import * as fs from 'fs';

interface IngestionConfig {
  interpreter: string;
  dataPath: string;
  batchSize: number;
  chunkOptions?: any;
}

class KnowledgeBaseIngestion {
  private preprocessor = new BookPreprocessor();
  private chunker = new SmartChunker();
  private classifier = new ContentClassifier();
  private ingestor = new DatabaseIngestor();
  
  async ingestInterpreterData(config: IngestionConfig): Promise<void> {
    const { interpreter, dataPath } = config;
    logger.info(`Starting ingestion for ${interpreter}`);
    
    const files = await fs.promises.readdir(dataPath);
    const textFiles = files.filter(f => f.endsWith('.txt'));
    
    const progress = new ProgressTracker(textFiles.length);
    
    for (const file of textFiles) {
      try {
        await this.processBook(
          path.join(dataPath, file),
          interpreter,
          config,
          progress
        );
      } catch (error) {
        logger.error(`Failed to process ${file}:`, error);
      }
    }
    
    logger.info(`Completed ingestion for ${interpreter}`);
  }
  
  private async processBook(
    filePath: string,
    interpreter: string,
    config: IngestionConfig,
    progress: ProgressTracker
  ): Promise<void> {
    logger.info(`Processing: ${path.basename(filePath)}`);
    
    // Preprocess book
    const { metadata, chapters, content } = await this.preprocessor.preprocessBook(
      filePath,
      interpreter
    );
    
    // Process each chapter
    const allChunks = [];
    
    for (const chapter of chapters) {
      // Chunk the chapter
      const chunks = this.chunker.chunkText(
        chapter.content,
        metadata.title,
        chapter.title,
        config.chunkOptions
      );
      
      // Classify and enhance each chunk
      for (const chunk of chunks) {
        const classification = this.classifier.classifyContent(chunk.content);
        
        const enhancedChunk = {
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
              source_type: 'book'
            },
            classification: {
              topic: classification.topics[0] || 'general',
              subtopics: classification.topics.slice(1),
              keywords: classification.keywords,
              confidence_score: classification.confidence,
              has_examples: classification.hasExamples,
              has_theory: classification.primaryType === 'theory',
              has_symbols: classification.hasSymbols
            }
          },
          embedding: null // Will be generated next
        };
        
        allChunks.push(enhancedChunk);
      }
    }
    
    // Generate embeddings in batches
    logger.info(`Generating embeddings for ${allChunks.length} chunks`);
    
    for (let i = 0; i < allChunks.length; i += config.batchSize) {
      const batch = allChunks.slice(i, i + config.batchSize);
      const texts = batch.map(chunk => chunk.content);
      
      try {
        const embeddings = await embeddingsService.generateEmbeddings(texts);
        
        batch.forEach((chunk, idx) => {
          chunk.embedding = embeddings[idx];
        });
        
        // Insert batch into database
        await this.ingestor.insertBatch(batch);
        
        progress.update(i / allChunks.length);
      } catch (error) {
        logger.error(`Failed to process batch ${i}-${i + config.batchSize}:`, error);
      }
      
      // Small delay to prevent overload
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    progress.complete();
  }
}

// Main execution
async function main() {
  const ingestion = new KnowledgeBaseIngestion();
  
  const configs: IngestionConfig[] = [
    {
      interpreter: 'jung',
      dataPath: '/Users/gole/Desktop/somni/somni-backend/somni-backend/RAG-data/jung',
      batchSize: 5
    },
    {
      interpreter: 'freud',
      dataPath: '/Users/gole/Desktop/somni/somni-backend/somni-backend/RAG-data/freud',
      batchSize: 5
    },
    {
      interpreter: 'mary',
      dataPath: '/Users/gole/Desktop/somni/somni-backend/somni-backend/RAG-data/neurocognitive',
      batchSize: 5
    },
    {
      interpreter: 'lakshmi',
      dataPath: '/Users/gole/Desktop/somni/somni-backend/somni-backend/RAG-data/new-age',
      batchSize: 5
    }
  ];
  
  for (const config of configs) {
    await ingestion.ingestInterpreterData(config);
    
    // Clean up memory between interpreters
    if (global.gc) {
      global.gc();
    }
  }
  
  logger.info('All ingestion complete!');
}

if (require.main === module) {
  main().catch(error => {
    logger.error('Fatal error:', error);
    process.exit(1);
  });
}
```

## Next Steps

1. **Implement Lakshmi Interpreter**
   - Add to types/index.ts
   - Create prompts/interpreters/lakshmi/
   - Update factory.ts
   
2. **Create Database Ingestor**
   - Implement batch insertion
   - Add deduplication logic
   - Create progress tracking

3. **Add Quality Testing**
   - Test retrieval accuracy
   - Measure semantic similarity
   - Validate classifications

4. **Optimize Performance**
   - Implement caching
   - Add concurrent processing
   - Monitor memory usage

## Running the Ingestion

```bash
# Install dependencies
npm install

# Run with garbage collection
node --expose-gc dist/scripts/rag/ingest-all.js

# Or run individual interpreters
node --expose-gc dist/scripts/rag/ingest-all.js --interpreter jung
```

## Monitoring Progress

The system will output:
- Real-time progress bars
- Chunk statistics
- Error summaries
- Performance metrics

## Validation

After ingestion, run:
```bash
npm run validate-knowledge-base
```

This will check:
- Embedding dimensions
- Content coverage
- Retrieval quality
- Classification accuracy