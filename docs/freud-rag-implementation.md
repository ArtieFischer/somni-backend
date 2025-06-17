# Freud RAG Implementation Guide

## Overview
The Freud interpreter now supports RAG (Retrieval-Augmented Generation) with enhanced metadata tagging for intelligent filtering and retrieval.

## Key Features

### 1. Enhanced Metadata Tagging
Each Freud text chunk is tagged with:
- **topic**: Primary category (dream, metapsych, case, ancillary, culture, commentary)
- **subtopic**: Specific themes (e.g., trauma, oedipus, anxiety, libido)
- **year**: Publication year for historical context
- **source**: Book/text name

### 2. Intelligent Filtering
The system automatically analyzes dream content to determine:
- Which topics to search (e.g., dream + metapsych for trauma themes)
- Which subtopics to boost for better relevance
- Optimal number of results based on theme complexity

### 3. Anti-Repetition
Tracks recently used chunks to avoid repetitive interpretations across sessions.

## Usage

### 1. Deploy Database Schema and Enhanced Search Function
```bash
# First ensure base schema exists (if fresh database)
psql your_database < src/scripts/sql/01-knowledge-base-schema.sql

# Then add enhanced search function with metadata filtering
psql your_database < src/scripts/sql/02-enhanced-search-knowledge.sql
```

### 2. Ingest Freud Texts
```bash
# Ensure Freud texts are in RAG-data/freud/
npm run ingest-freud
```

### 3. Enable Freud RAG
Set environment variables:
```bash
ENABLE_RAG=true
ENABLE_RAG_FREUD=true
```

### 4. Test Implementation
```bash
npm run test:freud-rag
```

## Filtering Logic

| Dream Content | Filter Applied | Boosted Subtopics |
|--------------|----------------|-------------------|
| Trauma, nightmares, war | dream + metapsych | trauma, repetition, death_drive |
| Family, parents | dream + case | oedipus, family, child |
| Sexual content | dream + metapsych | libido, psychosexual, wish |
| Anxiety, fear | dream + metapsych | anxiety, defence, repression |
| Slips, mistakes | dream + ancillary | slip, forgetting |
| Authority, religion | dream + culture | authority, religion, father |

## Architecture

```
DreamAnalysisRequest
    ↓
FreudianRAGPromptBuilder
    ↓
analyzeFreudianThemes() → determines filter/boost
    ↓
RAGService.getRelevantContext() → metadata filtering
    ↓
Enhanced Supabase RPC → pgvector search with JSONB filtering
    ↓
Anti-repetition filtering
    ↓
Enhanced prompt with relevant Freud passages
```

## Example API Call

```typescript
const response = await fetch('/api/dream/analyze', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    interpreterType: 'freud',
    dreamTranscription: 'I dreamed about my father...',
    userContext: {
      age: 35,
      emotionalState: 'anxious'
    }
  })
});
```

## Monitoring

Check logs for:
- `Freudian theme analysis` - shows detected themes and filters
- `Retrieved Freud RAG context` - passage count and relevance scores
- `Filtering out repeated chunk` - anti-repetition in action

## Troubleshooting

1. **No passages retrieved**: Check if Freud texts are ingested
2. **Wrong topic filtering**: Review theme detection logic in `analyzeFreudianThemes()`
3. **Repetitive content**: Verify anti-repetition set is working
4. **Enhanced RPC not found**: Ensure SQL migration ran successfully