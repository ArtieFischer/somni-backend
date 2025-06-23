# Updated BGE-M3 Implementation Guide

## Current System State (December 2024)

### What's Implemented
1. **Themes**: 726 psychological symbols with BGE-M3 embeddings (label-only)
2. **Knowledge Fragments**: 3,092 Jung text chunks with BGE-M3 embeddings
3. **Fragment-Theme Relationships**: 30,920 connections (10 themes per fragment)
4. **Indexing**: HNSW indexes on both tables for fast similarity search

### Key Configuration

#### Theme Embeddings
- Generated from: `"Dream symbol: {label}"` (NOT including descriptions)
- Version: `bge-m3-label-only`
- Why: Label-only embeddings are more distinct and literal

#### Fragment Processing
- Chunk size: 400-1200 characters
- Overlap: 1 paragraph
- Sources: 4 Jung books (archetypes, dreams, man-and-his-symbols, memories-dreams-reflections)

#### Tagging Configuration
- Method: Top-N approach (not threshold-based)
- Themes per fragment: 10
- Average similarity: 46-48%

### Common Commands

```bash
# Regenerate theme embeddings (label-only)
npm run regenerate:themes

# Ingest Jung books
npm run ingest:jung-books

# Tag all fragments with themes
npm run tag:all-fragments

# Test the complete system
npm run test:rag-complete

# Test dream analysis
npm run test:dream-themes
```

### SQL Queries

#### Find Jung quotes about a theme
```sql
SELECT * FROM search_fragments_by_theme(
  'shadow',     -- theme code
  0.0,         -- min similarity (0 = get all)
  10           -- max results
);
```

#### Analyze a dream
```javascript
// 1. Generate embedding
const dreamEmbedding = await bgeEmbeddingsService.generateEmbedding(dreamText);

// 2. Find matching themes
const { data: themes } = await supabase
  .rpc('search_themes', {
    query_embedding: dreamEmbedding,
    similarity_threshold: 0.0,
    max_results: 10
  });

// 3. Get Jung fragments for each theme
const { data: fragments } = await supabase
  .rpc('search_fragments_by_theme', {
    theme_code_param: 'water',
    similarity_threshold: 0.0,
    max_results: 5
  });
```

### Troubleshooting

#### Issue: Too many/few theme matches
- Adjust the `top_n` parameter when tagging
- Current setting: 10 themes per fragment
- Range: 5-20 depending on needs

#### Issue: Embeddings stored as strings
- PostgreSQL `vector` type is correct
- Supabase JS client returns as JSON strings
- Solution: Use database functions for similarity calculations

#### Issue: Only 1000 fragments processed
- Supabase default limit is 1000 rows
- Solution: Use pagination with `.range()`
- Or increase limit in Supabase dashboard

#### Issue: Unexpected theme matches
- Check if using label-only embeddings
- Run `npm run regenerate:themes` if needed
- Verify with: `SELECT embedding_version FROM themes LIMIT 1;`

### Performance Metrics
- Theme search: ~10ms for 726 themes
- Fragment search: ~50ms for 3,092 fragments  
- Embedding generation: ~200ms per text
- Full dream analysis: ~2-3 seconds

### Next Steps
1. Add more interpreters (Freud, Mary)
2. Implement dream journal features
3. Add user-specific analysis history
4. Create API endpoints for mobile app