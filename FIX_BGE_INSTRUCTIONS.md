# Quick Fix Instructions for BGE-M3 Issues

## Problem Summary
- Themes showing as random words ("beach", "maze", "track") instead of actual theme codes
- Content types being misclassified (e.g., dream examples as "methodology")
- Theme matching was using keyword search instead of semantic similarity

## Solution Steps

### 1. Apply Database Migration
```bash
cd somni-backend
supabase db push
```

### 2. Generate BGE Embeddings for Themes
```bash
npm run script src/scripts/rag/generate-theme-bge-embeddings.ts
```

### 3. Fix Existing Classifications
```bash
npm run script src/scripts/rag/fix-bge-classifications.ts
```

### 4. Test the Fixes
```bash
npm run script src/scripts/rag/test-bge-fixes.ts
```

### 5. Verify Results
```bash
npm run script src/scripts/rag/inspect-bge-data.ts
```

## Expected Results
After running these fixes:
- Themes will be proper codes like "falling", "flying", "being_chased"
- Content types will be correctly identified
- Theme matching will use semantic similarity with BGE embeddings
- Confidence scores will be based on actual similarity, not keyword matches

## Files Created/Modified
- `src/scripts/rag/core/knowledge-classifier-bge-fixed.ts` - Fixed classifier
- `supabase/migrations/20240101000003_add_bge_embeddings_to_themes.sql` - DB migration
- `src/scripts/rag/generate-theme-bge-embeddings.ts` - Theme embedding generator
- `src/scripts/rag/fix-bge-classifications.ts` - Fix existing data
- `src/scripts/rag/test-bge-fixes.ts` - Test the fixes
- `src/scripts/rag/ingest-jung-stream-bge.ts` - Updated to use fixed classifier