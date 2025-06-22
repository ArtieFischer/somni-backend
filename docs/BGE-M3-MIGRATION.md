# BGE-M3 Migration Guide

## Overview

This guide explains how to migrate from MiniLM embeddings (384 dimensions) to BGE-M3 embeddings (1024 dimensions) for improved semantic search quality in the Somni backend.

## Benefits of BGE-M3

- **2.67x larger embedding space** (1024D vs 384D)
- **Better semantic understanding** for philosophical texts
- **Support for long documents** (up to 8192 tokens)
- **Hybrid retrieval** with dense + sparse embeddings
- **Theme-aware search** with improved relevance

## Migration Steps

### 1. Run Database Migration

First, apply the database migration to add BGE-M3 support:

```bash
# Using Supabase CLI
supabase migration up

# Or run the SQL directly in Supabase Dashboard:
# supabase/migrations/20240101000000_add_bge_m3_support.sql
```

This migration:
- Adds `embedding_bge` column for 1024D vectors
- Adds `sparse_embedding` column for keyword matching
- Adds `metadata_v2` column for enhanced metadata
- Creates optimized HNSW indexes for fast search
- Adds new search functions with theme boosting

### 2. Re-ingest Content with BGE-M3

Create a new ingestion script that uses BGE-M3:

```typescript
// src/scripts/rag/reingest-with-bge.ts
import { bgeEmbeddingsService } from '../../services/embeddings-bge.service';
import { createClient } from '@supabase/supabase-js';
import { config } from '../../config';
import { logger } from '../../utils/logger';

async function reingestWithBGE() {
  const supabase = createClient(config.supabase.url, config.supabase.serviceRoleKey);
  
  // Fetch existing content
  const { data: entries, error } = await supabase
    .from('knowledge_base')
    .select('id, content, metadata')
    .eq('interpreter_type', 'jung')
    .order('id');
    
  if (error || !entries) {
    logger.error('Failed to fetch entries:', error);
    return;
  }
  
  logger.info(`Re-ingesting ${entries.length} entries with BGE-M3...`);
  
  // Process in batches
  const batchSize = 10;
  for (let i = 0; i < entries.length; i += batchSize) {
    const batch = entries.slice(i, i + batchSize);
    
    // Generate embeddings
    const embeddings = await bgeEmbeddingsService.generateEmbeddings(
      batch.map(e => e.content)
    );
    
    // Update database
    for (let j = 0; j < batch.length; j++) {
      const entry = batch[j];
      const embedding = embeddings[j];
      
      // Generate sparse embedding
      const fullEmbedding = await bgeEmbeddingsService.generateFullEmbedding(entry.content);
      
      // Update with new embeddings
      await supabase
        .from('knowledge_base')
        .update({
          embedding_bge: embedding,
          sparse_embedding: fullEmbedding.sparse ? 
            Object.fromEntries(fullEmbedding.sparse) : null,
          embedding_version: 'bge-m3',
          metadata_v2: {
            ...entry.metadata,
            embedding_model: 'bge-m3',
            embedding_date: new Date().toISOString()
          }
        })
        .eq('id', entry.id);
    }
    
    logger.info(`Progress: ${Math.min(i + batchSize, entries.length)}/${entries.length}`);
  }
  
  logger.info('Re-ingestion complete!');
}

reingestWithBGE();
```

Run the re-ingestion:
```bash
npm run reingest:bge
```

### 3. Update Your Code

#### Use the new BGE Hybrid RAG Service:

```typescript
import { bgeHybridRAGService } from './services/hybrid-rag-bge.service';

// Search with theme awareness
const results = await bgeHybridRAGService.searchKnowledge(query, {
  interpreterType: 'jung',
  maxResults: 10,
  useThemes: true,
  adaptiveScoring: true
});
```

#### Or use BGE embeddings directly:

```typescript
import { bgeEmbeddingsService } from './services/embeddings-bge.service';

// Generate embedding for a query
const embedding = await bgeEmbeddingsService.generateEmbedding(query);

// Use the new search function
const { data, error } = await supabase.rpc('search_knowledge_bge', {
  query_embedding: embedding,
  query_sparse: null,
  query_themes: ['shadow', 'transformation'],
  query_concepts: ['Shadow', 'Self'],
  target_interpreter: 'jung',
  similarity_threshold: 0.35,
  max_results: 10,
  use_hybrid: true
});
```

## Testing the Migration

### 1. Verify Database Schema

```sql
-- Check if new columns exist
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'knowledge_base' 
AND column_name IN ('embedding_bge', 'sparse_embedding', 'metadata_v2');

-- Check indexes
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename = 'knowledge_base' 
AND indexname LIKE '%bge%';
```

### 2. Test Search Quality

```typescript
// Run diagnostic tests
await bgeHybridRAGService.diagnoseSearch(
  "What does a snake symbolize in dreams?",
  "jung"
);
```

### 3. Compare Results

The BGE-M3 implementation should show:
- Higher semantic similarity scores for relevant content
- Better matching of philosophical concepts
- Improved handling of abstract queries
- More accurate theme detection

## Performance Considerations

1. **Memory Usage**: BGE-M3 uses more memory (~2GB when loaded)
2. **Embedding Time**: Slightly slower than MiniLM but more accurate
3. **Storage**: 1024D vectors use 2.67x more storage
4. **Search Speed**: HNSW indexes maintain fast search despite larger dimensions

## Rollback Plan

If needed, you can rollback by:

1. Continue using the original `embedding` column
2. Use the original search functions
3. The system supports both embeddings simultaneously

## Troubleshooting

### Common Issues:

1. **Out of Memory**: Increase Node.js heap size
   ```bash
   NODE_OPTIONS="--max-old-space-size=4096" npm run reingest:bge
   ```

2. **Slow Ingestion**: Reduce batch size in the ingestion script

3. **Search Errors**: Ensure the migration SQL was run successfully

4. **Missing Themes**: Verify `themes.json` exists at `supabase/scripts/themes.json`

## Next Steps

After migration:
1. Monitor search quality improvements
2. Collect user feedback on relevance
3. Fine-tune weights for your use case
4. Consider enabling sparse embeddings for better keyword matching