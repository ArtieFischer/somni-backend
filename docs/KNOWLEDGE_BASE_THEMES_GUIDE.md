# Knowledge Base with Theme Tagging - Implementation Guide

This guide explains the simplified knowledge base system that automatically tags book fragments with dream themes.

## Overview

The system consists of:
1. **knowledge_fragments** - Stores book chunks with BGE-M3 embeddings
2. **fragment_themes** - Links fragments to themes based on similarity
3. **Automatic tagging** - Offline process that creates fragment-theme relationships

## Setup Instructions

### 1. Run the migration
```bash
# In Supabase dashboard, run:
supabase/migrations/20240101000004_create_knowledge_base_themes.sql
```

### 2. Ingest Jung books
```bash
npm run ingest:jung-books
```

This will:
- Read all .txt files from `RAG-data/jung/`
- Split into paragraphs and create chunks (400-1200 chars)
- Generate BGE-M3 embeddings for each chunk
- Automatically tag fragments with themes (similarity > 0.28)

### 3. Test the system
```bash
npm run test:fragment-themes
```

## Database Structure

```sql
-- Book fragments with embeddings
knowledge_fragments (
  id UUID,
  source TEXT,           -- 'Jung_CW09', etc.
  author TEXT,           -- 'jung', 'freud', 'mary'
  text TEXT,             -- The actual content
  embedding vector(1024) -- BGE-M3 embedding
)

-- Fragment-theme relationships
fragment_themes (
  fragment_id UUID,
  theme_code TEXT,
  similarity REAL        -- Cosine similarity score
)
```

## Key Functions

### Search fragments by theme
```sql
SELECT * FROM search_fragments_by_theme(
  'water',     -- theme code
  0.25,        -- min similarity
  20           -- max results
);
```

### Get themes for a fragment
```sql
SELECT * FROM get_fragment_themes(
  'fragment-uuid',
  0.25,              -- min similarity
  10                 -- max themes
);
```

## Usage in Dream Analysis

```typescript
// When analyzing a dream, find relevant Jung passages
const { data: jungFragments } = await supabase
  .rpc('search_fragments_by_theme', {
    theme_code_param: 'shadow',
    similarity_threshold: 0.25,
    max_results: 5
  });

// Display to user
jungFragments.forEach(fragment => {
  console.log(`Jung on "${theme}": ${fragment.text}`);
  console.log(`From: ${fragment.source}`);
});
```

## Performance Notes

- HNSW index on fragments for fast similarity search
- Pre-computed fragment-theme relationships for instant lookup
- Typical query time: <50ms for finding relevant passages

## Adding More Books

1. Place .txt files in appropriate directory:
   - Jung: `RAG-data/jung/`
   - Freud: `RAG-data/freud/`
   - Mary: `RAG-data/mary/`

2. Update the ingestion script to process new authors:
   ```typescript
   await this.ingestBook(filePath, source, 'freud');
   ```

3. Run ingestion and tagging will happen automatically

## Maintenance

### Re-tag fragments with different threshold
```sql
SELECT * FROM tag_fragments_with_themes(
  0.25,  -- new similarity threshold
  100    -- batch size
);
```

### View statistics
```sql
SELECT * FROM fragment_theme_stats;
```

## Advantages over Previous System

1. **Simpler structure** - Just fragments and themes, no complex hierarchies
2. **Automatic tagging** - Fragments are tagged with all relevant themes
3. **Fast retrieval** - Pre-computed relationships + vector search
4. **Flexible** - Can adjust similarity thresholds without re-ingesting
5. **Scalable** - Works well with thousands of fragments

## Common Issues

1. **No fragments found**: Check if migration ran and embeddings exist
2. **Low similarity scores**: Try lowering threshold to 0.20-0.25
3. **Too many results**: Increase threshold or reduce max_results
4. **Slow tagging**: Normal for first run, subsequent runs are faster