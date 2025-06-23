# BGE-M3 System Quick Reference

## Essential Commands

### Theme Analysis
```bash
# Ingest/update theme embeddings
npm run ingest-themes-bge

# Test dream analysis with themes
npm run test:dream-themes
```

### Knowledge Base
```bash
# Ingest Jung books with auto-tagging
npm run ingest:jung-books

# Test fragment-theme search
npm run test:fragment-themes

# Diagnose tagging issues
npm run diagnose:tagging
```

## Key SQL Queries

### Find Jung Quotes by Theme
```sql
SELECT * FROM search_fragments_by_theme(
  'shadow',    -- theme code
  0.25,        -- min similarity
  10           -- max results
);
```

### Check System Status
```sql
-- Quick health check
SELECT 
  'themes' as table_name,
  COUNT(*) as total,
  COUNT(embedding) as with_embeddings,
  pg_typeof(embedding) as storage_type
FROM themes
WHERE embedding IS NOT NULL
GROUP BY pg_typeof(embedding)

UNION ALL

SELECT 
  'fragments',
  COUNT(*),
  COUNT(embedding),
  pg_typeof(embedding)
FROM knowledge_fragments
WHERE embedding IS NOT NULL
GROUP BY pg_typeof(embedding);
```

### Manual Theme Tagging
```sql
-- Tag all fragments with themes (if auto-tag failed)
INSERT INTO fragment_themes (fragment_id, theme_code, similarity)
SELECT 
  f.id,
  t.code,
  1 - (f.embedding <=> t.embedding)
FROM knowledge_fragments f, themes t
WHERE f.embedding IS NOT NULL
  AND t.embedding IS NOT NULL
  AND 1 - (f.embedding <=> t.embedding) >= 0.28
ON CONFLICT DO NOTHING;
```

## Common Issues & Fixes

### Issue: Embeddings stored as text/string
```sql
-- Check storage type
SELECT pg_typeof(embedding) FROM themes LIMIT 1;

-- Fix: Recreate table with vector(1024) type
```

### Issue: No theme matches found
```typescript
// Lower threshold from 0.28 to 0.20-0.25
similarity_threshold: 0.20
```

### Issue: Index not being used
```sql
-- Force index usage for testing
SET enable_seqscan = OFF;
-- Run query
SET enable_seqscan = ON;
```

## Architecture Overview
```
BGE-M3 Model (1024D)
    ├── Themes (726 symbols)
    │   └── HNSW Index
    └── Knowledge Fragments (Jung books)
        ├── HNSW Index
        └── Auto-tagged with themes
```

## API Usage

### TypeScript/JavaScript
```typescript
import { bgeEmbeddingsService } from './services/embeddings-bge.service.js';

// Generate embedding
const embedding = await bgeEmbeddingsService.generateEmbedding(text);

// Search themes
const { data: themes } = await supabase
  .rpc('search_themes', {
    query_embedding: embedding,
    similarity_threshold: 0.15,
    max_results: 10
  });

// Get Jung fragments for theme
const { data: fragments } = await supabase
  .rpc('search_fragments_by_theme', {
    theme_code_param: 'water',
    similarity_threshold: 0.25,
    max_results: 5
  });
```

## Performance Tips
1. Use HNSW index (not IVFFLAT) for Supabase
2. Keep similarity threshold between 0.20-0.30
3. Batch operations when possible
4. Run ANALYZE after large data changes