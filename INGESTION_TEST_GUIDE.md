# Testing Improved BGE Classifier

## Step 1: Quick Test of Classifier Logic

```bash
# Test the improved classifier with sample content
npx tsx src/scripts/rag/test-improved-classifier.ts
```

**Expected Results:**
- Theoretical content should get content type `theory`/`methodology` with ≤2 themes
- Dream content should get content type `dream_example` with relevant themes
- No more random theme assignments like "beach", "maze" for theoretical passages

## Step 2: Apply Database Migration (if not done)

```bash
# Ensure BGE theme embeddings are available
supabase db push
npx tsx src/scripts/rag/generate-theme-bge-embeddings.ts
```

## Step 3: Reprocess Existing Data

```bash
# Update existing BGE-M3 records with improved classifier
npx tsx src/scripts/rag/reprocess-bge-with-improved.ts
```

This will:
- Take existing BGE-M3 records 
- Re-classify them with the improved logic
- Show improvements (e.g., "Reduced random themes: old 5 themes → new 1 theme")
- Update database with better classifications

## Step 4: Inspect Results

```bash
# Check the improved classifications
npx tsx src/scripts/rag/inspect-bge-data.ts
```

**Look for:**
- Fewer random themes on theoretical content
- More appropriate content types
- Better theme-to-content matching

## Step 5: Fresh Ingestion (Optional)

If you want to start completely fresh:

```bash
# Clear existing BGE-M3 data
DELETE FROM knowledge_base WHERE embedding_version = 'bge-m3';

# Run fresh ingestion with improved classifier
npx tsx src/scripts/rag/ingest-jung-stream-bge.ts /path/to/jung/texts
```

## What Should Improve

### Before (Current Issues):
- **Theoretical passage**: "Freud calls this sequence of confused images..." 
  - ❌ Gets themes: `beach, maze, track, tail, riddle`
  - ❌ Content type: `methodology` (correct but themes wrong)

### After (Expected):
- **Same theoretical passage**:
  - ✅ Gets themes: `none` or 1-2 relevant psychological concepts
  - ✅ Content type: `methodology` or `theory`
  - ✅ High confidence for type, low for irrelevant themes

### Dream Content Should Still Work:
- **Dream narrative**: "I was walking on a beach, then found myself in a maze..."
  - ✅ Gets themes: `beach, maze, being_chased` (appropriate)
  - ✅ Content type: `dream_example`

## Quick Validation

After running the reprocessing, check a few records manually:

```sql
-- Check theoretical content (should have minimal themes)
SELECT content, content_type, metadata_v2->'applicable_themes' as themes
FROM knowledge_base 
WHERE embedding_version = 'bge-m3' 
  AND content_type IN ('theory', 'methodology')
  AND length(content) > 200
LIMIT 5;

-- Check dream examples (should have relevant themes)
SELECT content, content_type, metadata_v2->'applicable_themes' as themes
FROM knowledge_base 
WHERE embedding_version = 'bge-m3' 
  AND content_type = 'dream_example'
LIMIT 5;
```