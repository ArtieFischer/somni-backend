# BGE-M3 Embedding System Fixes

## Issues Identified

1. **Theme Extraction Problem**: The system was using keyword matching instead of semantic similarity, leading to random theme assignments (like "beach", "maze", "track" instead of actual theme codes)

2. **Theme Structure Mismatch**: The classifier expected themes to have `name`, `symbolInterpretations`, and `psychologicalAspects` properties, but themes.json only has `code`, `label`, and `description`

3. **Missing BGE Theme Embeddings**: Themes table only had 384D MiniLM embeddings, not 1024D BGE-M3 embeddings needed for semantic matching

4. **Content Type Misclassification**: Regex-based content type detection was incorrectly classifying content (e.g., dream examples as "methodology")

## Fixes Applied

### 1. Created Fixed Knowledge Classifier
- **File**: `src/scripts/rag/core/knowledge-classifier-bge-fixed.ts`
- Uses semantic similarity with BGE embeddings for theme matching
- Improved content type detection based on actual content patterns
- Returns proper theme codes instead of random words

### 2. Added BGE Embeddings to Themes Table
- **Migration**: `supabase/migrations/20240101000003_add_bge_embeddings_to_themes.sql`
- Adds `embedding_bge` column (1024D) to themes table
- Creates HNSW index for fast similarity search
- Adds functions for updating and searching BGE theme embeddings

### 3. Theme Embedding Generation Script
- **File**: `src/scripts/rag/generate-theme-bge-embeddings.ts`
- Generates BGE-M3 embeddings for all themes
- Stores them in the database for semantic matching

### 4. Classification Fix Script
- **File**: `src/scripts/rag/fix-bge-classifications.ts`
- Re-processes all existing BGE-M3 records with the fixed classifier
- Updates content types and themes to correct values

## How to Apply Fixes

### Step 1: Run Database Migration
```bash
# Apply the migration to add BGE embeddings to themes table
supabase migration up
```

### Step 2: Generate Theme BGE Embeddings
```bash
# Generate BGE-M3 embeddings for all themes
npm run script src/scripts/rag/generate-theme-bge-embeddings.ts
```

### Step 3: Fix Existing Classifications
```bash
# Re-classify all existing BGE-M3 records
npm run script src/scripts/rag/fix-bge-classifications.ts
```

### Step 4: Update Ingestion Script
The ingestion script has been updated to use the fixed classifier. Future ingestions will automatically use the correct classification.

## Verification

After running the fixes, you can verify the results:

```bash
# Check the updated data
npm run script src/scripts/rag/inspect-bge-data.ts
```

You should see:
- Themes are now proper theme codes from themes.json (e.g., "falling", "flying", "being_chased")
- Content types are correctly classified based on actual content
- Theme confidence scores are based on semantic similarity

## Technical Details

### Semantic Theme Matching
Instead of keyword matching, the fixed classifier:
1. Generates BGE-M3 embeddings for the text
2. Calculates cosine similarity with pre-computed theme embeddings
3. Selects themes with similarity > 0.3 threshold
4. Returns top 5 most similar themes

### Improved Content Type Detection
The classifier now checks for specific patterns:
- **dream_example**: Contains "dream/dreamt" + first-person narrative
- **case_study**: Contains "patient/case/analysis" + examples
- **symbol**: Multiple symbols + "symbol/represents/signifies"
- **methodology**: Contains "method/approach/technique/process"
- **theory**: Contains "theory/hypothesis/principle/concept"

### Performance Considerations
- Theme embeddings are pre-computed and cached
- HNSW index provides fast similarity search
- Batch processing prevents memory issues
- 500ms delay between theme embedding generations