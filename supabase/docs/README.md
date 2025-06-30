# Somni Database Schema Documentation

## Overview

This directory contains a clean, consolidated version of the Somni database schema. The schema has been rebuilt from the current production state to provide a clear, single-source-of-truth for the database structure.

## Directory Structure

```
supabase-clean/
├── migrations/
│   ├── 00000000000001_initial_schema.sql    # Complete initial schema
│   └── 00000000000002_seed_data.sql         # Initial seed data
├── types/
│   └── database.types.ts                     # TypeScript type definitions
├── functions/
│   └── README.md                             # Database functions documentation
├── scripts/
│   ├── reset-database.sh                     # Reset database to clean state
│   └── generate-types.sh                     # Generate TypeScript types
└── docs/
    ├── README.md                             # This file
    ├── schema-overview.md                    # High-level schema overview
    ├── tables/                               # Detailed table documentation
    └── migrations-guide.md                   # Guide for future migrations
```

## Key Components

### Core Tables

1. **User Management**
   - `profiles` - User profile information and settings
   - `interpreters` - Available dream interpreters (Jung, Freud, etc.)

2. **Dream Data**
   - `dreams` - Core dream entries with transcription status
   - `dream_images` - Generated images for dreams
   - `dream_embeddings` - BGE-M3 vector embeddings for semantic search
   - `dream_themes` - Extracted themes from dreams

3. **Analysis & Interpretation**
   - `themes` - Theme definitions with embeddings
   - `interpretations` - Dream interpretations with version history

4. **Conversations**
   - `conversations` - Conversation sessions between users and interpreters
   - `messages` - Individual messages within conversations
   - `elevenlabs_sessions` - Voice conversation session management

5. **Knowledge Base**
   - `knowledge_base` - Legacy RAG system (being phased out)
   - `knowledge_fragments` - New knowledge system with BGE-M3 embeddings
   - `fragment_themes` - Links between knowledge fragments and themes

6. **System Tables**
   - `transcription_usage` - Usage tracking for billing
   - `embedding_jobs` - Async job queue for processing

### Key Features

- **Vector Search**: Extensive use of pgvector for semantic similarity search
- **Multi-modal Support**: Text, audio, and image data handling
- **Real-time Updates**: Selected tables enabled for real-time subscriptions
- **Row Level Security**: Comprehensive RLS policies for data isolation
- **Async Processing**: Job queue system for heavy computations

### Embedding Systems

1. **BGE-M3 (1024 dimensions)** - Primary system
   - Used for dreams, themes, and knowledge fragments
   - Supports both dense and sparse embeddings
   - HNSW indexes for fast similarity search

2. **MiniLM (384 dimensions)** - Legacy system
   - Used for messages and legacy knowledge base
   - IVFFlat indexes

## Migration Strategy

When migrating from the current production schema:

1. **Backup** - Always backup your current database first
2. **Clean Install** - Run the initial schema migration on a fresh database
3. **Data Migration** - Migrate existing data (scripts to be provided)
4. **Validation** - Verify all data integrity and relationships

## TypeScript Types

The `types/database.types.ts` file provides complete type safety for:
- All table definitions
- Insert/Update operations
- Relationships between tables
- Database functions
- Enum types

## Security

All tables implement Row Level Security (RLS) with policies that:
- Allow users to access only their own data
- Provide service role bypass for backend operations
- Enable public read access for shared resources (themes, interpreters)

## Real-time Subscriptions

The following tables are enabled for real-time updates:
- `dreams`
- `dream_images`
- `conversations`
- `messages`

## Storage Buckets

Configured storage buckets:
- `avatars` - User profile pictures (public)
- `interpreters` - Interpreter images (public)
- `dream-images` - Generated dream images (private)
- `audio-messages` - Voice message recordings (private)

## Development Workflow

1. Make schema changes in a new migration file
2. Update TypeScript types
3. Test locally with Supabase CLI
4. Deploy to staging environment
5. Validate and deploy to production

## Maintenance

Regular maintenance tasks:
- Clean up stale embedding jobs
- Archive old conversations
- Optimize vector indexes
- Monitor transcription usage

For detailed information about specific tables or features, see the documentation in the `docs/tables/` directory.