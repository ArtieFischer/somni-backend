# Table Documentation

This directory contains detailed documentation for each table in the Somni database.

## Core Tables

### User Management
- [profiles.md](profiles.md) - User profiles and settings
- [interpreters.md](interpreters.md) - Dream interpreter personalities

### Dream Data
- [dreams.md](dreams.md) - Core dream entries
- [dream_images.md](dream_images.md) - Generated dream images
- [dream_embeddings.md](dream_embeddings.md) - Vector embeddings for dreams
- [dream_themes.md](dream_themes.md) - Dream-theme associations

### Analysis
- [themes.md](themes.md) - Theme definitions
- [interpretations.md](interpretations.md) - AI-generated interpretations

### Conversations
- [conversations.md](conversations.md) - Chat sessions
- [messages.md](messages.md) - Individual messages
- [elevenlabs_sessions.md](elevenlabs_sessions.md) - Voice chat sessions

### Knowledge Base
- [knowledge_fragments.md](knowledge_fragments.md) - Book/article content
- [fragment_themes.md](fragment_themes.md) - Fragment-theme associations

### System
- [transcription_usage.md](transcription_usage.md) - Usage tracking
- [embedding_jobs.md](embedding_jobs.md) - Async job queue

## Table Relationships

```
auth.users
    ↓
profiles ←→ interpreters
    ↓
dreams → dream_images
  ↓  ↓
  ↓  dream_embeddings
  ↓
  ├→ dream_themes ←→ themes
  ├→ interpretations
  └→ conversations → messages
           ↓
    elevenlabs_sessions

knowledge_fragments ←→ fragment_themes ←→ themes
```

## Common Patterns

### Row Level Security
Most tables follow these RLS patterns:
1. Users can access their own data
2. Service role has full access
3. Some tables (themes, interpreters) allow public read

### Timestamps
Tables typically include:
- `created_at` - Set on insert
- `updated_at` - Updated via trigger

### Status Fields
Many tables track processing status:
- `pending` - Awaiting processing
- `processing` - Currently being processed
- `completed` - Successfully processed
- `failed` - Processing failed

### Vector Embeddings
Two embedding systems:
- BGE-M3 (1024 dimensions) - Primary
- MiniLM (384 dimensions) - Legacy