# Knowledge Base Quick Reference

## Summary

We're building an enhanced RAG (Retrieval-Augmented Generation) system for the Somni dream interpretation app that will provide context-aware interpretations for each of the four interpreters.

## Key Improvements Over Previous System

1. **Smart Chunking**: Instead of simple character-based splitting, we now use semantic boundaries (paragraphs, sentences) with contextual overlap
2. **Rich Metadata**: Each chunk includes book metadata, classification, topics, and quality indicators
3. **Content Classification**: Automatic detection of content types (theory, symbols, case studies, etc.)
4. **Memory Optimization**: Batch processing with garbage collection to handle large texts
5. **Lakshmi Support**: Adding the missing fourth interpreter

## Database Schema

```sql
-- Existing knowledge_base table with enhanced metadata
knowledge_base (
  id               bigint PK
  interpreter_type text            -- 'jung'/'freud'/'mary'/'lakshmi'
  source           text            -- Book/article name
  chapter          text            -- Section
  content          text            -- Text chunk
  content_type     text            -- 'theory'/'symbol'/'case_study' etc.
  metadata         jsonb           -- Rich metadata (see below)
  embedding        vector(384)     -- MiniLM embedding
  created_at       timestamptz
)
```

### Metadata Structure
```json
{
  "book_metadata": {
    "source_title": "Man and His Symbols",
    "source_author": "Carl Jung",
    "source_year": 1964,
    "source_type": "book"
  },
  "classification": {
    "topic": "archetypes",
    "subtopics": ["shadow", "anima"],
    "keywords": ["collective unconscious", "symbolism"],
    "confidence_score": 0.85,
    "has_examples": true,
    "has_theory": true,
    "has_symbols": true
  },
  "chunk_metadata": {
    "chapter_title": "The Importance of Dreams",
    "chapter_number": 3,
    "chunk_position": 5,
    "total_chunks": 42
  }
}
```

## Interpreter Mapping

- **Jung** → jung (4 books on archetypes, dreams, symbols)
- **Freud** → freud (18 books on psychoanalysis, dreams)
- **Mary** → mary (6 books on neurocognitive science)
- **Lakshmi** → lakshmi (6 books on spiritual/new-age approaches)

## Key Components

### 1. Embeddings
- Model: `Xenova/all-MiniLM-L6-v2`
- Dimensions: 384
- Method: Mean pooling with normalization

### 2. Search Function
```sql
-- Existing function, works with new metadata
search_knowledge(
  query_embedding vector(384),
  target_interpreter text,
  similarity_threshold float DEFAULT 0.7,
  max_results int DEFAULT 5
)
```

### 3. RAG Service Enhancement
- Metadata filtering (by topic, content type)
- Relevance boosting (prioritize certain subtopics)
- Symbol extraction from retrieved passages

## Implementation Checklist

- [ ] Add Lakshmi to InterpreterType in `src/types/index.ts`
- [ ] Create `src/prompts/interpreters/lakshmi/` directory
- [ ] Update `src/prompts/factory.ts` to include Lakshmi
- [ ] Implement smart chunking algorithm
- [ ] Add content classification system
- [ ] Create batch ingestion pipeline
- [ ] Test with small dataset first
- [ ] Run full ingestion for all interpreters
- [ ] Validate retrieval quality

## Quick Commands

```bash
# Test embeddings locally
npm run test-embeddings

# Ingest single book
npm run ingest-book -- --file path/to/book.txt --interpreter jung

# Ingest all books for an interpreter
npm run ingest-interpreter -- --interpreter lakshmi

# Validate knowledge base
npm run validate-kb

# Test RAG retrieval
npm run test-rag -- --query "What does water symbolize in dreams?"
```

## Performance Guidelines

1. **Chunk Size**: 800-1200 characters (optimal for MiniLM)
2. **Batch Size**: 5-10 chunks per embedding batch
3. **Memory**: Process one book at a time
4. **Concurrency**: Use async/await properly, avoid blocking

## Common Issues & Solutions

| Issue | Solution |
|-------|----------|
| Out of memory | Reduce batch size, enable GC |
| Slow embeddings | Check model initialization, use caching |
| Poor retrieval | Adjust similarity threshold, check metadata |
| Missing context | Increase overlap size, improve chunking |

## Testing Retrieval Quality

```typescript
// Example test query
const testQueries = {
  jung: "What is the shadow archetype?",
  freud: "How does dream censorship work?",
  mary: "What happens in the brain during REM sleep?",
  lakshmi: "How to practice lucid dreaming?"
};
```

## Next Actions

1. **Immediate**: Add Lakshmi interpreter type
2. **Today**: Set up ingestion pipeline structure
3. **This Week**: Ingest all knowledge bases
4. **Testing**: Validate retrieval quality
5. **Optimization**: Fine-tune based on results