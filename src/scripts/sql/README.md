# Database SQL Scripts

## Overview
These scripts set up the knowledge base for the RAG (Retrieval-Augmented Generation) system.

## Scripts

### 01-knowledge-base-schema.sql
- Creates the main `knowledge_base` table
- Sets up vector indexes for similarity search
- Creates basic `search_knowledge` function
- Run this first on a fresh database

### 02-enhanced-search-knowledge.sql
- Adds enhanced search capabilities with metadata filtering
- Supports boosting based on subtopics
- Required for Freud RAG implementation
- Run after 01 script

## Usage

```bash
# For fresh setup
psql your_database < 01-knowledge-base-schema.sql
psql your_database < 02-enhanced-search-knowledge.sql

# For existing database with knowledge_base table
psql your_database < 02-enhanced-search-knowledge.sql
```

## Notes
- Vector dimension is 384 (using gte-small model)
- Supports interpreters: jung, freud, neuroscientist, universal
- Metadata is stored as JSONB for flexible filtering