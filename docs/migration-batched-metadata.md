# Migration Guide: Batched Metadata Generation

## Overview

We've consolidated the dream metadata generation from 2 separate LLM calls into a single batched call that generates both the dream title and image prompt together. Additionally, symbol extraction has been removed from the backend as it's now handled by the Edge Function.

## Key Changes

### 1. Removed Functions
- ❌ `openRouterService.generateDreamTitle()` - No longer use separately
- ❌ `openRouterService.generateDreamSceneDescription()` - No longer use separately  
- ❌ Symbol extraction - Now handled by Edge Function

### 2. New Function
- ✅ `openRouterService.generateDreamMetadata()` - Single call for title + image prompt

### 3. Response Format Change

**Old approach (2 calls):**
```typescript
// Call 1: Generate title
const title = await openRouterService.generateDreamTitle(transcript);

// Call 2: Generate scene description  
const sceneDescription = await openRouterService.generateDreamSceneDescription(transcript);
```

**New approach (1 batched call):**
```typescript
const metadata = await openRouterService.generateDreamMetadata(transcript, {
  dreamId: dreamId,
  model: 'mistralai/mistral-nemo:free' // optional
});

// Returns:
{
  title: string;           // 4-7 word dream title
  imagePrompt: string;     // ≤30 word visual scene description
  usage: TokenUsage;       // Token usage stats
  model: string;           // Model used (with fallback chain)
}
```

## Database Changes

### Dream Images Storage
Images are now stored in the `dream_images` table instead of directly in the `dreams` table:

```sql
-- dreams table stores only the image_prompt
UPDATE dreams SET image_prompt = ? WHERE id = ?;

-- dream_images table stores the actual image
INSERT INTO dream_images (dream_id, storage_path, is_primary) 
VALUES (?, ?, true);
```

## Implementation Example

### Before:
```typescript
// In transcription route
let title: string | undefined;
let imagePrompt: string | undefined;

// Generate title
if (features.titleGeneration.enabled) {
  title = await openRouterService.generateDreamTitle(transcription.text);
}

// Generate scene for image
if (features.imageGeneration.enabled) {
  imagePrompt = await openRouterService.generateDreamSceneDescription(transcription.text);
  const imageUrl = await imageRouterService.generateDreamImage(imagePrompt);
  // ... handle image upload
}
```

### After:
```typescript
// In transcription route  
let title: string | undefined;
let imagePrompt: string | undefined;

if (features.titleGeneration.enabled || features.imageGeneration.enabled) {
  // Single batched call
  const metadata = await openRouterService.generateDreamMetadata(transcription.text, {
    dreamId
  });
  
  title = metadata.title;
  imagePrompt = metadata.imagePrompt;
  
  // Generate image if enabled
  if (features.imageGeneration.enabled && imagePrompt) {
    const imageUrl = await imageRouterService.generateDreamImage(imagePrompt);
    // ... handle image upload to dream_images table
  }
}
```

## Benefits

1. **Performance**: ~50% reduction in latency (1 call vs 2)
2. **Cost**: Lower token usage overall
3. **Consistency**: Title and image prompt share context
4. **Reliability**: Using Mistral Nemo as primary (no moderation issues)
5. **Simplicity**: Single error handling path

## Model Configuration

Default model chain:
1. Primary: `mistralai/mistral-nemo:free` (12B, handles all content)
2. Fallback 1: `cognitivecomputations/dolphin3.0-mistral-24b:free`
3. Fallback 2: `mistralai/mistral-7b-instruct:free`

## Testing

Run the test scripts to verify the implementation:

```bash
# Test batched metadata generation
./scripts/shell-tests/test-batched-metadata.sh

# Test full transcription flow
./scripts/shell-tests/test-full-transcription-flow.sh

# Test image generation with new approach
npm run test:image-generation
```

## Deprecation Notice

The following endpoints/functions are deprecated:
- `/api/v1/scene-description` - Use batched metadata instead
- `generateDreamTitle()` - Use `generateDreamMetadata()`
- `generateDreamSceneDescription()` - Use `generateDreamMetadata()`

## Migration Checklist

- [ ] Update transcription route to use `generateDreamMetadata()`
- [ ] Update image saving to use `dream_images` table
- [ ] Remove calls to deprecated functions
- [ ] Update any tests using old functions
- [ ] Verify model fallback chain works correctly
- [ ] Test with controversial content to ensure Mistral Nemo handles it