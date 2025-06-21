# Complete Database Architecture

## Overview

The Somni database is designed for a dream journaling and interpretation app with advanced features including:
- Location-based heatmaps of dream themes
- AI-powered dream interpretation with multiple interpreters
- Semantic search using MiniLM embeddings (384 dimensions)
- Real-time updates for dreams and images
- Conversation history for future chat features

## Core Tables

### 1. **profiles** (User Profiles)
Extended user profiles with location tracking for heatmap features.

```sql
profiles (
  user_id            uuid PK         -- References auth.users
  handle             text UNIQUE     -- @username (unique identifier)
  username           text            -- Display name
  sex                sex_enum        -- male/female/other/unspecified
  birth_date         date
  avatar_url         text
  locale             varchar(10)     -- RFC 5646 language tag
  dream_interpreter  text FK         -- References interpreters.id
  is_premium         boolean
  onboarding_complete boolean
  
  -- Location fields
  location           geography       -- PostGIS point for exact coords
  location_accuracy  loc_accuracy_enum -- none/country/region/city/exact
  location_country   text            -- Fallback country
  location_city      text            -- Fallback city
  
  settings           jsonb           -- User preferences
  created_at         timestamptz
  updated_at         timestamptz
)
```

**Settings JSON Structure:**
```json
{
  "location_sharing": "none|country|city|exact",
  "sleep_schedule": { "bed": "23:30", "wake": "07:00", "tz": "Europe/Warsaw" },
  "improve_sleep_quality": true,
  "interested_in_lucid_dreaming": false
}
```

### 2. **dreams** (Core Dream Data)
Main table for dream entries with embeddings and location.

```sql
dreams (
  id                   uuid PK
  user_id              uuid FK         -- References profiles.user_id
  created_at           timestamptz
  updated_at           timestamptz
  
  -- Content
  title                text            -- AI-generated title
  raw_transcript       text            -- Original voice transcription
  refined_narrative    text            -- Enhanced/cleaned version
  
  -- Sleep data
  sleep_phase          sleep_phase_enum -- unknown/n1/n2/n3/rem
  is_lucid             boolean
  mood_before          smallint        -- -5 to 5 scale
  mood_after           smallint        -- -5 to 5 scale
  
  -- Location (for heatmap)
  location             geography       -- Dream location
  location_accuracy    loc_accuracy_enum
  
  -- AI/ML
  embedding            vector(384)     -- MiniLM embedding
  image_prompt         text            -- Prompt for image generation
  
  -- Transcription tracking
  transcription_status transcription_status_enum
  transcription_metadata jsonb
  transcription_job_id text
)
```

### 3. **dream_images** (Generated Images)
Multiple images per dream, stored in Supabase Storage.

```sql
dream_images (
  id          uuid PK
  dream_id    uuid FK         -- References dreams.id
  storage_path text           -- Supabase Storage path
  is_primary  boolean         -- Main display image
  generated_at timestamptz
)
```

### 4. **themes** (Dream Theme Definitions)
Pre-defined dream themes with embeddings for semantic matching.

```sql
themes (
  code        text PK         -- e.g., 'falling', 'flying'
  label       text            -- Display name
  description text            -- Detailed description
  embedding   vector(384)     -- MiniLM embedding
  created_at  timestamptz
)
```

### 5. **dream_themes** (Dream-Theme Associations)
Many-to-many relationship between dreams and themes.

```sql
dream_themes (
  dream_id    uuid FK         -- References dreams.id
  theme_code  text FK         -- References themes.code
  rank        smallint        -- 1-10, relevance order
  score       real            -- Cosine similarity score
  explanation text            -- Why this theme was detected
  PRIMARY KEY (dream_id, theme_code)
)
```

### 6. **interpretations** (AI Interpretations)
Stores dream interpretations from different AI interpreters.

```sql
interpretations (
  id               uuid PK
  dream_id         uuid FK         -- References dreams.id
  interpreter_id   text FK         -- References interpreters.id
  interpretation   text            -- Main interpretation
  key_symbols      jsonb           -- Extracted symbols
  advice           text            -- Actionable advice
  mood_analysis    jsonb           -- Mood insights
  created_at       timestamptz
  version          int             -- Version tracking
)
```

### 7. **interpreters** (AI Interpreter Profiles)
The four dream interpretation personalities.

```sql
interpreters (
  id                   text PK         -- 'carl', 'sigmund', 'lakshmi', 'mary'
  name                 text            -- Display name
  full_name            text            -- Full name
  description          text            -- Bio/description
  image_url            text            -- Profile image
  interpretation_style jsonb           -- Style metadata
  created_at           timestamptz
)
```

Pre-populated with:
- **carl** - Carl Jung (Jungian archetypes)
- **sigmund** - Sigmund Freud (Freudian analysis)
- **lakshmi** - Lakshmi Devi (Spiritual/karmic)
- **mary** - Mary Whiton (Cognitive science)

### 8. **conversations** & **messages** (Future Chat Feature)
For conversational AI interactions about dreams.

```sql
conversations (
  id              uuid PK
  user_id         uuid FK         -- References profiles.user_id
  interpreter_id  text FK         -- References interpreters.id
  dream_id        uuid FK         -- Optional dream reference
  started_at      timestamptz
  last_message_at timestamptz
)

messages (
  id              bigserial PK
  conversation_id uuid FK         -- References conversations.id
  sender          text            -- 'user'/'interpreter'/'system'
  content         text
  embedding       vector(384)     -- For semantic search
  created_at      timestamptz
)
```

### 9. **knowledge_base** (RAG System)
Stores text chunks from interpreter source materials for context.

```sql
knowledge_base (
  id               bigint PK
  interpreter_type text            -- 'jung'/'freud'/'mary'/'lakshmi'
  source           text            -- Book/article name
  chapter          text            -- Section
  content          text            -- Text chunk
  content_type     text            -- 'theory'/'symbol'/'case_study'
  metadata         jsonb           -- Flexible metadata
  embedding        vector(384)     -- MiniLM embedding
  created_at       timestamptz
)
```

### 10. **transcription_usage** (Billing/Limits)
Tracks API usage for transcription services.

```sql
transcription_usage (
  id               uuid PK
  user_id          uuid FK         -- References profiles.user_id
  dream_id         uuid FK         -- References dreams.id
  duration_seconds integer
  provider         text            -- 'whisper'/'deepgram'
  created_at       timestamptz
)
```

## Enums

```sql
-- User demographics
CREATE TYPE sex_enum AS ENUM ('male', 'female', 'other', 'unspecified');

-- Transcription status
CREATE TYPE transcription_status_enum AS ENUM (
  'pending',     -- Queued
  'processing',  -- In progress
  'done',        -- Completed
  'error'        -- Failed
);

-- Sleep phases
CREATE TYPE sleep_phase_enum AS ENUM ('unknown', 'n1', 'n2', 'n3', 'rem');

-- Location accuracy
CREATE TYPE loc_accuracy_enum AS ENUM ('none', 'country', 'region', 'city', 'exact');
```

## Key Features

### 1. **MiniLM Embeddings (384-dim)**
- Used for dreams, themes, messages, and knowledge base
- Enables semantic search and theme matching
- Processed via Supabase Edge Functions using xenova/transformers

### 2. **Location Tracking**
- PostGIS geography type for precise coordinates
- Privacy-first with accuracy levels
- Enables global heatmap of dream themes

### 3. **Real-time Updates**
- Enabled on `dreams` and `dream_images` tables
- Allows live updates in the UI

### 4. **Row Level Security (RLS)**
- Users can only access their own data
- Service role has full access for backend operations
- Public read access for themes, interpreters, and knowledge base

### 5. **Storage Buckets**
- `avatars` - User profile pictures
- `interpreters` - Interpreter profile images
- `dream-images` - AI-generated dream visualizations

## Edge Functions

### 1. **embed-dream**
Generates embeddings for dreams and extracts themes.

**Endpoint:** `/embed-dream`
**Method:** POST
**Body:**
```json
{
  "dream_id": "uuid",
  "transcript": "dream text",
  "extract_themes": true
}
```

### 2. **embed-themes**
Batch generates embeddings for theme definitions.

**Endpoint:** `/embed-themes`
**Method:** POST
**Body:**
```json
{
  "themes": [
    {
      "code": "falling",
      "label": "Falling",
      "description": "Dreams about falling or losing control"
    }
  ]
}
```

### 3. **dreams-transcribe-init**
Handles dream transcription initialization (existing).

## SQL Functions

### 1. **search_themes**
Finds themes matching a dream embedding.
```sql
search_themes(
  query_embedding vector(384),
  similarity_threshold float DEFAULT 0.15,
  max_results int DEFAULT 10
) RETURNS TABLE (code, label, score)
```

### 2. **search_knowledge**
Searches interpreter knowledge base.
```sql
search_knowledge(
  query_embedding vector(384),
  target_interpreter text DEFAULT 'jung',
  similarity_threshold float DEFAULT 0.7,
  max_results int DEFAULT 5
) RETURNS TABLE (id, content, source, chapter, content_type, similarity)
```

## Security Model

1. **Authentication**: Supabase Auth (auth.users)
2. **Authorization**: Row Level Security policies
3. **Service Role**: Backend operations with full access
4. **Public Access**: Read-only for themes, interpreters, knowledge base

## Performance Optimizations

1. **Indexes**:
   - B-tree indexes on foreign keys and timestamps
   - GiST indexes for geography columns
   - IVFFlat indexes for vector similarity search

2. **Vector Search**:
   - IVFFlat with tuned list parameters
   - Cosine similarity for theme matching

3. **Real-time**:
   - Only enabled on frequently updated tables

## Migration from Old Schema

Since this is a fresh start:
1. Drop all existing tables
2. Run `000_initial_schema.sql`
3. Populate themes using `embed-themes` function
4. Re-ingest knowledge base data

## Future Considerations

1. **Table Partitioning**: When dreams table grows large
2. **Materialized Views**: For complex analytics
3. **Additional Indexes**: Based on query patterns
4. **Archival Strategy**: For old dreams/conversations