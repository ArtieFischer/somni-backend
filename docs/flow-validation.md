# Flow Validation: Transcription → Metadata → Image Generation

## Current Implementation Status ✅

### 1. Model Chain Configuration
✅ **Llama 4 as Primary**
```typescript
// In openrouter.ts generateDreamMetadata()
const modelChain = options.model 
  ? [options.model]
  : [
      'meta-llama/llama-4-scout:free',        // Primary (fast, handles most content)
      'mistralai/mistral-nemo:free',          // Fallback (handles controversial)
      'cognitivecomputations/dolphin3.0-mistral-24b:free'  // Final fallback
    ];
```

### 2. Error Handling & Retries

#### Metadata Generation (Title + Image Prompt)
✅ **Automatic fallback chain with retries**
```typescript
for (const model of modelChain) {
  try {
    // Attempt generation
    const completion = await this.client.chat.completions.create({...});
    // Success - return result
    return { title, imagePrompt, usage, model };
  } catch (error) {
    // Log error
    logger.error('Dream metadata generation failed', {...});
    
    // If last model, throw error
    if (model === modelChain[modelChain.length - 1]) {
      throw this.handleOpenRouterError(lastError);
    }
    
    // Wait 1 second before trying next model
    await this.delay(1000);
  }
}
```

#### Image Generation
✅ **Two model retry system**
```typescript
const models = [this.primaryModel, this.fallbackModel];
for (const model of models) {
  try {
    // Generate image
    return imageUrl;
  } catch (error) {
    if (model === this.primaryModel) {
      // Try fallback model
      continue;
    }
    // Both failed - throw error
    throw this.handleImageRouterError(lastError);
  }
}
```

### 3. Complete Flow After Transcription

✅ **The following happens automatically after transcription completes:**

1. **Transcription Success** → Audio converted to text

2. **Metadata Generation** (Single batched call)
   - Llama 4 attempts first
   - If fails (moderation/error) → Mistral Nemo tries
   - If fails → Dolphin3.0 Mistral tries
   - Returns: `{ title, imagePrompt }`

3. **Database Updates**
   - Dream record updated with `title` and `image_prompt`
   - Transcription status set to 'completed'

4. **Image Generation** (if feature enabled)
   - Uses `imagePrompt` from metadata
   - Primary image model attempts
   - If fails → Fallback model tries
   - Downloads generated image
   - Uploads to Supabase storage

5. **Final Database Update**
   - Inserts into `dream_images` table with storage path
   - Sets `is_primary = true`

### 4. Error Handling Scenarios

✅ **Metadata Generation Failures**
- Continues with transcription (non-blocking)
- Logs error but doesn't fail the request
- Dream saved without title/image

✅ **Image Generation Failures**
- Continues with transcription (non-blocking)
- Logs error but doesn't fail the request
- Dream saved with title but no image

✅ **Database Update Failures**
- Returns error to client
- Updates dream status to 'failed'
- Preserves error details in metadata

### 5. Moderation Handling

✅ **Controversial Content Flow**
```
1. Llama 4 tries → Gets moderation error (403)
2. Automatically falls back to Mistral Nemo
3. Mistral Nemo handles controversial content successfully
4. Returns metadata without moderation issues
```

## Test Commands

### Test the complete flow:
```bash
# Test with normal content (Llama 4 should handle)
./scripts/shell-tests/test-batched-metadata.sh

# Test with controversial content (should fallback to Mistral)
./scripts/shell-tests/test-final-validation.sh

# Test full transcription flow
./scripts/shell-tests/test-full-transcription-flow.sh
```

### Monitor logs for:
```
- "Attempting dream metadata generation" (shows which model)
- "Dream metadata generation failed" (shows fallback)
- "Dream metadata generated successfully" (shows final model used)
- "Generating dream image via ImageRouter"
- "Dream image generated successfully"
- "Dream image updated" (database save)
```

## Configuration Summary

### Models:
- **Metadata Primary**: Llama 4 Scout (fast, general content)
- **Metadata Fallback 1**: Mistral Nemo 12B (handles all content)
- **Metadata Fallback 2**: Dolphin3.0 Mistral 24B
- **Image Primary**: google/gemini-2.0-flash-exp:free
- **Image Fallback**: black-forest-labs/FLUX-1-schnell:free

### Timeouts:
- Metadata generation: No explicit timeout (relies on OpenRouter)
- Model retry delay: 1 second
- Image generation: 60 seconds
- Image download: 30 seconds

### Database:
- Dreams table: Stores `title` and `image_prompt`
- Dream_images table: Stores `storage_path` and `is_primary`

## Confirmation ✅

The implementation is complete with:
1. ✅ Llama 4 as primary model
2. ✅ Mistral Nemo as fallback for controversial content
3. ✅ Automatic retry chain for both metadata and images
4. ✅ Non-blocking error handling (failures don't stop transcription)
5. ✅ Proper database updates to new schema structure
6. ✅ Runs automatically after transcription completes