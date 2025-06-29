# Dreams Table

## Overview
The `dreams` table is the core entity in the Somni database, storing all dream entries with their transcriptions, metadata, and processing status.

## Schema

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | uuid | PRIMARY KEY | Unique identifier |
| user_id | uuid | NOT NULL, FK(auth.users) | Dream owner |
| created_at | timestamptz | NOT NULL DEFAULT now() | Creation timestamp |
| updated_at | timestamptz | NOT NULL DEFAULT now() | Last update timestamp |
| title | text | | LLM-generated dream title |
| raw_transcript | text | | Voice-to-text transcription |
| image_prompt | text | | Prompt for image generation |
| is_lucid | boolean | NOT NULL DEFAULT false | Lucid dream flag |
| mood | smallint | CHECK (1-5) | Post-dream mood rating |
| clarity | smallint | CHECK (1-100) | Dream clarity percentage |
| location_metadata | jsonb | | Location data structure |
| transcription_status | enum | NOT NULL DEFAULT 'pending' | Transcription pipeline status |
| transcription_metadata | jsonb | | Transcription service metadata |
| transcription_job_id | text | | External job identifier |
| embedding_status | text | DEFAULT 'pending' | Embedding generation status |
| embedding_error | text | | Error message if embedding fails |
| embedding_attempts | integer | DEFAULT 0, CHECK (0-3) | Retry counter |
| embedding_processed_at | timestamptz | | Completion timestamp |
| embedding_started_at | timestamptz | | Processing start time |

## Location Metadata Structure
```json
{
  "city": "San Francisco",
  "country": "United States",
  "countryCode": "US",
  "method": "manual" | "gps"
}
```

## Enums

### transcription_status_enum
- `pending` - Awaiting transcription
- `processing` - Being transcribed
- `completed` - Successfully transcribed
- `failed` - Transcription failed

### embedding_status
- `pending` - Awaiting embedding generation
- `processing` - Embeddings being generated
- `completed` - Embeddings ready
- `failed` - Generation failed
- `skipped` - Skipped (e.g., transcript too short)

## Indexes
- `idx_dreams_user_id` - User's dreams
- `idx_dreams_created_at` - Chronological ordering
- `idx_dreams_mood` - Mood-based queries
- `idx_dreams_clarity` - Clarity-based queries
- `idx_dreams_location_metadata` - Location searches (GIN)
- `idx_dreams_transcription_status` - Processing pipeline
- `idx_dreams_embedding_status` - Embedding pipeline
- `idx_dreams_embedding_attempts` - Retry management

## Relationships
- **Belongs to**: `auth.users` (via user_id)
- **Has many**: 
  - `dream_images` - Generated images
  - `dream_embeddings` - Vector embeddings
  - `dream_themes` - Extracted themes
  - `interpretations` - AI interpretations
  - `conversations` - Related chat sessions

## Triggers
- `trg_dreams_updated` - Updates `updated_at` timestamp
- `trigger_create_embedding_job` - Creates embedding job when transcription completes

## RLS Policies
- **Users can manage own dreams** - Full CRUD on own dreams
- **Service role has full access** - Backend operations

## Usage Examples

### Create a new dream
```sql
INSERT INTO dreams (user_id, raw_transcript, transcription_status)
VALUES (auth.uid(), 'I was flying over mountains...', 'pending');
```

### Get user's recent dreams
```sql
SELECT id, title, created_at, mood, clarity
FROM dreams
WHERE user_id = auth.uid()
ORDER BY created_at DESC
LIMIT 10;
```

### Find dreams by location
```sql
SELECT id, title, location_metadata
FROM dreams
WHERE user_id = auth.uid()
  AND location_metadata->>'city' = 'San Francisco';
```

### Get dreams pending embedding
```sql
SELECT id, raw_transcript
FROM dreams
WHERE embedding_status = 'pending'
  AND transcription_status = 'completed'
  AND embedding_attempts < 3
ORDER BY created_at ASC;
```

## Processing Pipeline

1. **Creation**: Dream created with `transcription_status = 'pending'`
2. **Transcription**: External service processes audio → `transcription_status = 'completed'`
3. **Embedding Job**: Trigger creates job in `embedding_jobs` table
4. **Embedding Generation**: Worker processes → `embedding_status = 'completed'`
5. **Theme Extraction**: Themes identified and stored in `dream_themes`
6. **Interpretation**: AI generates interpretation in `interpretations` table

## Best Practices

1. **Always check transcription_status** before processing transcript
2. **Respect embedding_attempts** limit to avoid infinite retries
3. **Store structured data in location_metadata** for efficient querying
4. **Use transactions** when updating multiple related tables
5. **Monitor embedding_error** for common failure patterns

## Migration Notes

From old schema:
- `mood_before` and `mood_after` consolidated to single `mood`
- `refined_narrative` removed (use interpretations instead)
- `location` (geography) replaced with `location_metadata` (jsonb)
- `embedding` (vector) moved to separate `dream_embeddings` table