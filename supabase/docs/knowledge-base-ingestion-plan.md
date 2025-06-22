# Knowledge Base Ingestion Plan

## Overview

This document outlines a comprehensive plan for ingesting interpreter knowledge into the Somni RAG system. The goal is to create a robust, searchable knowledge base for each interpreter (Jung, Freud, Mary/Neurocognitive, and Lakshmi/New-Age) that enhances dream interpretations with contextual information from relevant texts.

## Current State Analysis

### Database Structure
- **Table**: `knowledge_base` (already exists in schema)
- **Embeddings**: Using Xenova/all-MiniLM-L6-v2 (384 dimensions)
- **Vector Search**: pgvector with cosine similarity
- **Current Interpreters**: jung, freud, mary (missing: lakshmi)

### Data Sources
- **Jung**: 4 books (archetypes.txt, dreams.txt, man-and-his-symbols.txt, memories-dreams-reflections.txt)
- **Freud**: 18 books (interpretation-of-dreams.txt, etc.)
- **Mary (Neurocognitive)**: 6 books (The-Committee-of-Sleep.txt, etc.)
- **Lakshmi (New-Age)**: 6 books (Conscious-Dreaming.txt, dream-yoga.txt, etc.)

### Previous Issues
- Simple chunking approach lost context
- No metadata for filtering/boosting
- Large memory consumption during ingestion
- Limited content type classification

## Improved Knowledge Base Schema

### Enhanced Metadata Structure
```typescript
interface KnowledgeMetadata {
  // Book/Source metadata
  source_title: string;          // Full book title
  source_author: string;         // Author name
  source_year?: number;          // Publication year
  source_type: 'book' | 'article' | 'lecture' | 'case_study';
  
  // Content classification
  topic: string;                 // Primary topic (e.g., 'archetypes', 'dreams', 'symbols')
  subtopics: string[];          // Related subtopics
  keywords: string[];           // Key terms/concepts
  
  // Chunk metadata
  chapter_title?: string;        // Chapter/section name
  chapter_number?: number;       // Chapter number
  page_range?: string;          // Original page numbers
  chunk_position: number;        // Position within chapter
  total_chunks: number;         // Total chunks in chapter
  
  // Quality indicators
  has_examples: boolean;        // Contains practical examples
  has_theory: boolean;          // Contains theoretical content
  has_symbols: boolean;         // Contains symbol interpretations
  confidence_score: number;     // 0-1 confidence in extraction
}
```

### Content Types (Enhanced)
```typescript
type ContentType = 
  | 'theory'              // Theoretical concepts
  | 'symbol'              // Symbol interpretations
  | 'case_study'          // Clinical examples
  | 'dream_example'       // Dream interpretations
  | 'technique'           // Therapeutic techniques
  | 'definition'          // Term definitions
  | 'biography'           // Personal history
  | 'methodology'         // Research methods
  | 'practice'            // Practical exercises
```

## Ingestion Pipeline Architecture

### 1. Pre-processing Phase
```typescript
class BookPreprocessor {
  // Extract book metadata from filename and content
  extractBookMetadata(filename: string, content: string): BookMetadata
  
  // Detect and extract chapter structure
  detectChapters(content: string): Chapter[]
  
  // Clean and normalize text
  normalizeText(text: string): string
  
  // Extract key concepts/glossary
  extractKeyTerms(content: string): string[]
}
```

### 2. Smart Chunking Strategy
```typescript
class SmartChunker {
  // Semantic chunking based on content structure
  chunkBySemanticBoundaries(text: string, options: ChunkOptions): Chunk[]
  
  // Maintain context across chunks
  addContextualOverlap(chunks: Chunk[]): Chunk[]
  
  // Optimize chunk size based on content type
  getOptimalChunkSize(contentType: ContentType): number
}

interface ChunkOptions {
  targetSize: number;        // 800-1200 tokens (optimal for MiniLM)
  overlapSize: number;       // 150-200 tokens
  respectParagraphs: boolean;
  respectSentences: boolean;
  maxSize: number;          // 1500 tokens hard limit
}
```

### 3. Content Classification
```typescript
class ContentClassifier {
  // Multi-label classification
  classifyContent(text: string): {
    primaryType: ContentType;
    confidence: number;
    secondaryTypes: ContentType[];
  }
  
  // Extract topics using NLP
  extractTopics(text: string): {
    mainTopic: string;
    subtopics: string[];
    confidence: number;
  }
  
  // Detect special content
  detectSpecialContent(text: string): {
    hasSymbols: boolean;
    hasExamples: boolean;
    hasCaseStudy: boolean;
    hasExercise: boolean;
  }
}
```

### 4. Embedding Generation
```typescript
class EmbeddingGenerator {
  // Generate embeddings with retry logic
  async generateEmbedding(text: string): Promise<number[]>
  
  // Batch processing with memory management
  async generateBatchEmbeddings(
    texts: string[], 
    batchSize: number = 5
  ): Promise<number[][]>
  
  // Cache embeddings to avoid regeneration
  cacheEmbedding(text: string, embedding: number[]): void
}
```

### 5. Database Ingestion
```typescript
class DatabaseIngestor {
  // Upsert with deduplication
  async upsertChunks(chunks: ProcessedChunk[]): Promise<void>
  
  // Batch insertion with progress tracking
  async batchInsert(
    chunks: ProcessedChunk[], 
    onProgress: (progress: number) => void
  ): Promise<void>
  
  // Verify ingestion quality
  async verifyIngestion(source: string): Promise<QualityReport>
}
```

## Implementation Plan

### Phase 1: Infrastructure Setup
1. Create enhanced ingestion scripts structure
2. Implement book preprocessor with metadata extraction
3. Set up progress tracking and logging system
4. Create configuration system for different interpreters

### Phase 2: Smart Chunking Implementation
1. Implement semantic boundary detection
2. Create content-aware chunking algorithm
3. Add contextual overlap mechanism
4. Optimize chunk sizes based on testing

### Phase 3: Classification System
1. Build content type classifier
2. Implement topic extraction
3. Create keyword extraction system
4. Add confidence scoring

### Phase 4: Ingestion Process
1. Process Jung texts (smallest dataset)
2. Process Freud texts
3. Process Mary/Neurocognitive texts
4. Process Lakshmi/New-Age texts
5. Verify and validate all ingested content

### Phase 5: Quality Assurance
1. Implement similarity search testing
2. Create relevance scoring benchmarks
3. Build retrieval accuracy metrics
4. Optimize based on test results

## Technical Considerations

### Memory Management
- Process one book at a time
- Use streaming for large files
- Implement garbage collection between books
- Limit embedding batch sizes

### Performance Optimization
- Use concurrent processing where possible
- Implement caching for embeddings
- Batch database operations
- Use database transactions

### Error Handling
- Retry failed embeddings
- Log all errors with context
- Skip corrupted chunks
- Provide detailed error reports

## Interpreter-Specific Considerations

### Jung
- Focus on archetypes, symbols, collective unconscious
- Preserve case study contexts
- Extract dream interpretation examples

### Freud
- Emphasize psychoanalytic concepts
- Maintain clinical case connections
- Extract symbolic interpretations

### Mary (Neurocognitive)
- Focus on scientific research
- Preserve experimental data
- Extract brain-dream connections

### Lakshmi (New-Age/Spiritual)
- Emphasize spiritual practices
- Preserve meditation techniques
- Extract lucid dreaming methods

## Success Metrics

1. **Coverage**: 95%+ of source text successfully chunked
2. **Relevance**: 80%+ accuracy in content type classification
3. **Performance**: <5 seconds average retrieval time
4. **Quality**: 85%+ user satisfaction with retrieved context

## Next Steps

1. Review and approve this plan
2. Set up development environment
3. Create test suite for validation
4. Begin Phase 1 implementation
5. Schedule regular progress reviews