# Somni Database Schema Overview

## Architecture Overview

The Somni database is designed to support a dream journaling and interpretation platform with the following key capabilities:

1. **Dream Recording** - Voice-to-text transcription and storage
2. **AI Interpretation** - Multiple interpreter personalities providing insights
3. **Semantic Search** - Vector embeddings for finding similar dreams and themes
4. **Conversational AI** - Real-time chat with interpreters about dreams
5. **Knowledge Integration** - RAG system for grounding interpretations in literature

## Data Flow

```
User Voice Recording
    ↓
Transcription Service (Whisper/Deepgram)
    ↓
Dreams Table (raw_transcript)
    ↓
Embedding Job Queue
    ↓
BGE-M3 Embedding Service
    ↓
Dream Embeddings Table
    ↓
Theme Extraction
    ↓
Dream Themes Table
    ↓
Interpretation Generation
    ↓
Interpretations Table
```

## Table Relationships

### User-Centric Tables
```
auth.users
    ↓
profiles (1:1)
    ↓
dreams (1:many)
    ├── dream_images (1:many)
    ├── dream_embeddings (1:many)
    ├── dream_themes (many:many with themes)
    ├── interpretations (1:many)
    ├── shared_dreams (1:1 per user)
    └── conversations (1:many)
        └── messages (1:many)
```

### Knowledge System
```
interpreters (static data)
    ↓
knowledge_fragments (many)
    └── fragment_themes (many:many with themes)

themes (shared across system)
    ├── dream_themes
    └── fragment_themes
```

### Processing Pipeline
```
dreams (transcription_status: pending)
    ↓
External Transcription Service
    ↓
dreams (transcription_status: completed)
    ↓ (trigger)
embedding_jobs (status: pending)
    ↓
Embedding Service Worker
    ↓
dream_embeddings + dreams.embedding_status
```

## Key Design Decisions

### 1. Embedding Strategy
- **BGE-M3** (1024-dim) for new content - better multilingual support
- **MiniLM** (384-dim) for legacy content - faster, English-focused
- Chunking strategy for long dreams to stay within token limits
- HNSW indexes for sub-50ms similarity searches

### 2. Multi-Interpreter System
- 4 distinct interpreter personalities (Jung, Freud, Lakshmi, Mary)
- Each has unique interpretation styles and knowledge bases
- Interpretations are versioned for iterative improvements

### 3. Real-time Capabilities
- WebSocket support for conversations
- ElevenLabs integration for voice conversations
- Real-time subscriptions on key tables

### 4. Data Privacy
- Strict RLS policies ensuring users only access their own data
- Service role bypass for backend operations
- Public data limited to themes and interpreter info

### 5. Scalability Considerations
- Async job queue for expensive operations
- Indexed vector searches with configurable similarity thresholds
- Separate storage buckets for different media types
- Chunking strategy prevents memory issues with long content

## Performance Optimizations

### Indexes
- **B-tree indexes** on foreign keys and timestamp columns
- **GIN indexes** on JSONB fields for metadata queries
- **HNSW indexes** on vector columns for similarity search
- **Partial indexes** for filtered queries (e.g., `WHERE is_premium = true`)

### Caching Strategy
- Theme embeddings are pre-computed and cached
- Knowledge fragments are pre-embedded during ingestion
- Interpretation results include fragment IDs for audit trail

### Query Patterns
- Batch processing for embedding generation
- Limit clauses on all similarity searches
- Efficient joins using indexed foreign keys

## Migration Path

### From Legacy System
1. **Profiles** - Direct migration with new fields
2. **Dreams** - Update transcription_status enum values
3. **Embeddings** - Re-generate using BGE-M3
4. **Themes** - Re-compute associations with new embeddings
5. **Knowledge** - Migrate from knowledge_base to knowledge_fragments

### Future Enhancements
- [ ] Multi-language embedding models
- [ ] Sparse embedding support for hybrid search
- [ ] Dream clustering and trend analysis
- [x] Social features (shared dreams, anonymous) - Implemented via shared_dreams table
- [ ] Advanced analytics dashboard

## Security Model

### Authentication Levels
1. **Anonymous** - Can read public themes, interpreters, and active shared dreams
2. **Authenticated** - Full access to own data and ability to share/unshare dreams
3. **Service Role** - Backend operations and cross-user analytics

### Data Isolation
- User data is isolated via RLS policies
- No cross-user data access except through service role
- Storage buckets enforce user-based folder structure

### Sensitive Data
- No PII in transcripts or interpretations
- Audio files in private storage buckets
- Session tokens expire and are single-use

## Monitoring & Maintenance

### Key Metrics
- Embedding job queue depth
- Average transcription processing time
- Vector search query performance
- Storage usage by bucket

### Cleanup Tasks
- Stale embedding jobs (>10 minutes)
- Expired ElevenLabs sessions
- Orphaned storage objects
- Old conversation sessions

### Health Checks
- Transcription service connectivity
- Embedding service availability
- Vector index performance
- Storage bucket accessibility