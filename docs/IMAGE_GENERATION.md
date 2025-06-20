# Dream Image Generation

This document describes the image generation feature added to the Somni backend.

## Overview

The dream image generation feature automatically creates AI-generated images based on dream transcriptions. When a dream is transcribed, the system:

1. Generates a visual scene description from the dream transcript
2. Uses ImageRouter to create an artistic image based on that description
3. Uploads the image to Supabase storage
4. Stores the image URL and prompt in the database

## Configuration

Image generation is configured through environment variables:

```bash
# Enable/disable image generation (default: true)
ENABLE_IMAGE_GENERATION=true

# ImageRouter API configuration
IMAGEROUTER_API_KEY=your_imagerouter_api_key
IMAGE_PRIMARY_MODEL=google/gemini-2.0-flash-exp:free
IMAGE_FALLBACK_MODEL=black-forest-labs/FLUX-1-schnell:free

# Scene description generation settings
SCENE_DESCRIPTION_MAX_TOKENS=100
SCENE_DESCRIPTION_TEMPERATURE=0.8
```

## Architecture

### Services

1. **OpenRouterService** (`src/services/openrouter.ts`)
   - `generateDreamSceneDescription()`: Creates a visual scene description from dream text

2. **ImageRouterService** (`src/services/imageRouter.ts`)
   - `generateDreamImage()`: Generates an image using ImageRouter API
   - `downloadImage()`: Downloads the generated image

3. **SupabaseService** (`src/services/supabase.ts`)
   - `uploadDreamImage()`: Uploads image to Supabase storage
   - `updateDreamImage()`: Updates dream record with image URL

### Database Schema

The following columns were added to the `dreams` table:

```sql
ALTER TABLE dreams ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE dreams ADD COLUMN IF NOT EXISTS image_prompt TEXT;
```

### Image Style

All dream images are generated with a consistent artistic style:
- 8mm camera photography aesthetic
- Scanned with low-resolution 90s scanner look
- Ethereal and abstract
- Very limited colors with one dominating (purple OR green)
- Afterglow effect
- Surreal atmosphere
- Artistic interpretation

### Model Fallback

The service uses a two-model approach:
1. **Primary Model**: `google/gemini-2.0-flash-exp:free` - Attempted first
2. **Fallback Model**: `black-forest-labs/FLUX-1-schnell:free` - Used if primary fails

This ensures higher reliability for image generation.

## API Flow

When a dream is transcribed via `/api/v1/transcription/transcribe`:

1. Dream audio is transcribed to text
2. A title is generated (if enabled)
3. A scene description is generated from the transcript
4. ImageRouter generates an image from the scene description
5. The image is uploaded to Supabase storage bucket `dream-images`
6. The dream record is updated with the image URL and prompt

## Testing

To test image generation manually:

```bash
npm run tsx src/scripts/test-image-generation.ts
```

## Error Handling

Image generation failures are logged but don't fail the transcription process. If image generation fails:
- The transcription continues normally
- Error is logged with details
- Dream record has null image_url and image_prompt

## Frontend Integration

The frontend can access generated images via:
- `dream.image_url`: Public URL to the generated image
- `dream.image_prompt`: The scene description used (for debugging)

Images are stored in the public `dream-images` bucket with the pattern: `{dreamId}.png`