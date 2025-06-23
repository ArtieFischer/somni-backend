# BGE-M3 Migration Complete Documentation

## Overview
We successfully migrated the entire embedding system from 384-dimensional embeddings to BGE-M3 1024-dimensional embeddings. This includes both the themes system and the knowledge base (Jung books).

## What We Accomplished

### 1. Theme Embeddings Migration
- **Migrated**: 726 themes from 384D to 1024D BGE-M3 embeddings
- **Storage**: Properly stored as PostgreSQL `vector(1024)` type
- **Indexing**: HNSW index created for fast similarity search
- **Testing**: Dream analysis successfully finds relevant themes with 50-67% accuracy

### 2. Knowledge Base System Redesign
- **Simplified Architecture**: Replaced complex hierarchical system with straightforward fragment-theme relationships
- **Tables Created**:
  - `knowledge_fragments`: Stores book chunks with BGE-M3 embeddings
  - `fragment_themes`: Junction table linking fragments to themes
- **Automatic Tagging**: Fragments are automatically tagged with relevant themes based on cosine similarity

### 3. Key Issues Resolved

#### Vector Storage Problem
- **Issue**: Supabase JS client was storing embeddings as JSON strings instead of vectors
- **Solution**: Ensured tables use proper `vector(1024)` type, which automatically handles the conversion
- **Verification**: Test script confirms vectors are stored correctly

#### Duplicate Data
- **Issue**: Accidental double ingestion created 6184 fragments instead of 3092
- **Solution**: Created cleanup scripts to remove duplicates

#### Memory Constraints
- **Issue**: IVFFLAT index creation failed due to Supabase's 32MB memory limit
- **Solution**: Switched to HNSW index which has no memory constraints

## Migration Scripts Created

### 1. Theme Migration
```bash
# Migration SQL
supabase/migrations/20240101000002_clean_and_prepare_bge.sql
supabase/migrations/20240101000003_add_bge_embeddings_to_themes.sql

# Ingestion script
npm run ingest-themes-bge

# Testing
npm run test:dream-themes
```

### 2. Knowledge Base Setup
```bash
# Migration SQL
supabase/migrations/20240101000004_create_knowledge_base_themes.sql

# Setup and cleanup
supabase/scripts/clean-and-setup-fragments.sql
supabase/scripts/setup-knowledge-fragments.sql

# Ingestion
npm run ingest:jung-books

# Testing
npm run test:fragment-themes
npm run diagnose:tagging
```

### 3. Helper Scripts
```bash
# Check index performance
supabase/scripts/test-index-performance.sql

# Verify vector storage
supabase/scripts/check-vector-columns.sql

# Force index usage tests
supabase/scripts/force-index-test.sql
```

## Key Learnings

### 1. Vector Storage in Supabase
- Must use `vector(n)` column type in PostgreSQL
- Supabase JS client automatically handles array-to-vector conversion
- Always verify storage format with `pg_typeof()`

### 2. Index Selection
- HNSW is preferred over IVFFLAT for Supabase due to memory constraints
- For small datasets (<1000 rows), PostgreSQL may prefer sequential scan
- Index usage increases automatically as data grows

### 3. Embedding Compatibility
- All embeddings must use the same model (BGE-M3)
- Dimension mismatch (384 vs 1024) prevents similarity calculations
- Always verify dimensions match before operations

## Current System Architecture

```
┌─────────────────┐         ┌──────────────────┐
│     themes      │         │ knowledge        │
│  726 symbols    │◄────────┤ fragments        │
│  vector(1024)   │ tagged  │  3092 chunks     │
│  HNSW indexed   │  with   │  vector(1024)    │
└─────────────────┘         │  HNSW indexed    │
                            └──────────────────┘
                                     │
                            ┌────────▼─────────┐
                            │ fragment_themes  │
                            │  relationships   │
                            │  ~2000 per 100   │
                            │  fragments       │
                            └──────────────────┘
```

## Usage Examples

### Finding Jung Quotes for a Theme
```typescript
const { data: jungFragments } = await supabase
  .rpc('search_fragments_by_theme', {
    theme_code_param: 'shadow',
    similarity_threshold: 0.25,
    max_results: 5
  });
```

### Analyzing Dreams
```typescript
// Generate embedding for dream
const dreamEmbedding = await bgeEmbeddingsService.generateEmbedding(dreamText);

// Find matching themes
const { data: themes } = await supabase
  .rpc('search_themes', {
    query_embedding: dreamEmbedding,
    similarity_threshold: 0.15,
    max_results: 8
  });
```

## Performance Metrics
- Theme search: ~7ms for 726 themes
- Fragment search: ~50ms for 3000+ fragments
- Embedding generation: ~200ms per text
- Batch tagging: ~1.5M comparisons in ~30 seconds

## Next Steps
1. Add more interpreters (Freud, Mary)
2. Implement hybrid search with sparse embeddings
3. Add user-specific dream analysis history
4. Create API endpoints for mobile app integration

## Maintenance Commands

### Check System Status
```sql
-- Overall status
SELECT 
  (SELECT COUNT(*) FROM themes WHERE embedding IS NOT NULL) as themes_with_embeddings,
  (SELECT COUNT(*) FROM knowledge_fragments) as total_fragments,
  (SELECT COUNT(*) FROM fragment_themes) as theme_relationships;

-- Verify vector types
SELECT table_name, pg_typeof(embedding) as type
FROM (
  SELECT 'themes' as table_name, embedding FROM themes LIMIT 1
  UNION ALL
  SELECT 'fragments', embedding FROM knowledge_fragments LIMIT 1
) t;
```

### Re-run Tagging
```sql
-- Clear and retag with different threshold
DELETE FROM fragment_themes;
SELECT * FROM tag_fragments_with_themes(0.25, 100);
```

## Troubleshooting

### "Different vector dimensions" error
- Check all embeddings are 1024D
- Verify using same BGE-M3 model
- Run dimension check SQL

### No search results
- Lower similarity threshold (try 0.20)
- Check if embeddings exist
- Verify index is being used

### Slow queries
- Run ANALYZE on tables
- Check index usage with EXPLAIN
- Consider increasing work_mem

## File Cleanup
We identified and can remove old 384D embedding files:
- `supabase/functions/embed-themes/` (old edge function)
- Various test files for 384D system
- Old migration functions

Run cleanup with: `npm run cleanup:384d`