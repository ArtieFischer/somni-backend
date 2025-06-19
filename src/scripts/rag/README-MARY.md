# Mary (Neuroscientist) RAG Scripts

This directory contains scripts for managing Mary's neuroscience knowledge base in the RAG system.

## Available Scripts

### 1. `ingest-mary-texts.ts`
Main ingestion script that processes all neuroscience texts from `rag-data/neurocognitive/`.

```bash
npm run script src/scripts/rag/ingest-mary-texts.ts
```

Features:
- Processes multiple neuroscience books
- Intelligent chunking with chapter detection
- Metadata tagging for subtopics (memory, emotion, REM, etc.)
- Batch processing with rate limiting

### 2. `clean-mary-db.ts`
Removes all neuroscience documents from the database. Use before re-ingesting to avoid duplicates.

```bash
npm run script src/scripts/rag/clean-mary-db.ts
```

### 3. `check-mary-data.ts`
Verifies what neuroscience content is in the database.

```bash
npm run script src/scripts/rag/check-mary-data.ts
```

Shows:
- Total document count
- Breakdown by source book
- Most common subtopics
- Sample documents

### 4. `test-mary-rag.ts`
Tests Mary's RAG retrieval with various dream scenarios.

```bash
npm run script src/scripts/rag/test-mary-rag.ts
```

### 5. `compare-mary-rag.ts`
Compares Mary's interpretations with and without RAG enhancement.

```bash
npm run script src/scripts/rag/compare-mary-rag.ts
```

### 6. `ingest-single-mary-text.ts`
Ingests a single neuroscience text file.

```bash
npm run script src/scripts/rag/ingest-single-mary-text.ts "The-Committee-of-Sleep.txt"
```

## Neuroscience Texts

The following books are available in `rag-data/neurocognitive/`:

1. **The Committee of Sleep** - Dream creativity and problem-solving
2. **This Is Why You Dream** - Modern neuroscience of dreaming
3. **dreaming-and-brain.txt** - Neural mechanisms of dreams
4. **neuroscience-of-sleep-and-dream.txt** - Sleep architecture and brain waves
5. **twenty-four-hour-mind.txt** - Circadian rhythms and sleep disorders
6. **when-brain-dreams.txt** - Consciousness and neural correlates

## Metadata Structure

Each text chunk includes:
- `topic`: Always "neuroscience" for Mary
- `subtopic`: Array of relevant themes like:
  - memory, consolidation, hippocampus
  - emotion, amygdala, stress, cortisol
  - rem, nrem, sleep_stages, brain_waves
  - creativity, problem_solving, insight
  - consciousness, awareness, lucid
  - circadian, sleep_disorders, insomnia

## Typical Workflow

1. Clean existing data (if needed):
   ```bash
   npm run script src/scripts/rag/clean-mary-db.ts
   ```

2. Ingest all neuroscience texts:
   ```bash
   npm run script src/scripts/rag/ingest-mary-texts.ts
   ```

3. Verify ingestion:
   ```bash
   npm run script src/scripts/rag/check-mary-data.ts
   ```

4. Test RAG functionality:
   ```bash
   npm run script src/scripts/rag/test-mary-rag.ts
   ```

5. Enable Mary RAG in environment:
   ```bash
   export ENABLE_RAG=true
   export ENABLE_RAG_MARY=true
   ```

## Testing Mary

Use the shell script to test Mary's interpretation style:

```bash
./test-mary.sh
```

This tests various dream scenarios including:
- Memory and learning dreams
- Sleep quality issues
- Creative problem-solving
- Emotional processing
- Lucid dreaming experiences