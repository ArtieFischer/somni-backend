# Duration Support Implementation Summary

## Overview
Added support for audio duration in the transcription flow to filter out very short recordings and track language usage.

## Changes Made

### 1. Database Migration
- **File**: `/supabase/migrations/20250124_add_language_to_transcription_usage.sql`
- Added `language_code` column to `transcription_usage` table
- Added `character_count` column (for reference, not used for filtering)
- Added index on `language_code` for performance

### 2. Edge Function Updates
- **File**: `/supabase/functions/dreams-transcribe-init/index.ts`
- Added `duration` field to `TranscribeRequest` interface
- Pass duration from mobile app to backend API
- Added logging for duration parameter

### 3. Backend API Updates

#### Types
- **File**: `/src/types/index.ts`
- Added optional `duration` field to `TranscribeRequest` interface

#### Validation
- **File**: `/src/middleware/validation.ts`
- Made `duration` field optional in validation schema (since mobile app might not send it initially)

#### Transcription Route
- **File**: `/src/routes/transcription.ts`
- Extract duration from request body
- Use duration (if provided) to filter out short recordings (< 3 seconds)
- Fall back to character count (< 30 chars) if duration not provided
- Pass duration to usage tracking
- Include duration in response metadata
- Enhanced logging to include duration

#### Supabase Service
- **File**: `/src/services/supabase.ts`
- Updated `recordTranscriptionUsage` to save:
  - `character_count`: Character count of transcription
  - `language_code`: Detected language code
  - `duration_seconds`: Audio duration (existing field)

## Filtering Logic

The system now uses this priority for filtering short content:
1. If duration is provided: Skip if < 3 seconds
2. If duration not provided: Skip if transcript < 30 characters

## Next Steps

1. Run the database migration:
   ```bash
   supabase db push
   ```

2. Regenerate database types:
   ```bash
   supabase gen types typescript --local > supabase/types/database.types.ts
   ```

3. Deploy edge function:
   ```bash
   supabase functions deploy dreams-transcribe-init
   ```

4. Update mobile app to send duration in the transcription request

## Mobile App Update Required

The mobile app should send the audio duration when calling the edge function:

```typescript
const response = await supabase.functions.invoke('dreams-transcribe-init', {
  body: {
    dreamId: dreamId,
    audioBase64: base64Audio,
    language: selectedLanguage,
    duration: audioDurationInSeconds // NEW FIELD
  }
});
```