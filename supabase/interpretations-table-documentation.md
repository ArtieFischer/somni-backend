# Interpretations Table Documentation

## Overview
The `interpretations` table stores AI-generated dream interpretations from various interpreters (Jung, Freud, Mary, Lakshmi). Each interpretation contains both a summary and detailed analysis with multiple structured fields.

## Table Structure

### Primary Keys & Constraints
- **Primary Key**: `id` (UUID, auto-generated)
- **Unique Constraint**: `(dream_id, interpreter_type, version)` - Ensures only one interpretation per dream/interpreter/version combination
- **Foreign Keys**:
  - `dream_id` → `dreams(id)` ON DELETE CASCADE
  - `user_id` → `profiles(user_id)` ON DELETE CASCADE  
  - `interpreter_type` → `interpreters(id)`
  - `previous_version_id` → `interpretations(id)` (self-referential for versioning)

### Columns

| Column Name | Type | Nullable | Default | Description |
|-------------|------|----------|---------|-------------|
| `id` | UUID | NO | `gen_random_uuid()` | Unique identifier for the interpretation |
| `dream_id` | UUID | NO | - | References the dream being interpreted |
| `user_id` | UUID | NO | - | User who owns the dream (denormalized for RLS) |
| `interpreter_type` | TEXT | NO | - | References interpreter id (e.g., 'jung', 'freud') |
| `interpretation_summary` | TEXT | NO | - | Brief summary of the interpretation (1-2 sentences) |
| `full_response` | JSONB | NO | - | Complete interpretation data structure |
| `dream_topic` | TEXT | NO | - | Main theme/topic of the dream |
| `quick_take` | TEXT | NO | - | Quick insight about the dream (1 sentence) |
| `symbols` | TEXT[] | YES | `{}` | Array of key symbols identified in the dream |
| `emotional_tone` | JSONB | YES | - | Emotional analysis with primary/secondary emotions |
| `primary_insight` | TEXT | YES | - | Main psychological insight |
| `key_pattern` | TEXT | YES | - | Key pattern or theme identified |
| `knowledge_fragments_used` | INTEGER | YES | 0 | Number of knowledge fragments used |
| `total_fragments_retrieved` | INTEGER | YES | 0 | Total fragments retrieved from RAG |
| `fragment_ids_used` | TEXT[] | YES | `{}` | IDs of knowledge fragments used |
| `processing_time_ms` | INTEGER | YES | - | Time taken to generate interpretation |
| `model_used` | TEXT | YES | 'gpt-4o' | AI model used for generation |
| `created_at` | TIMESTAMPTZ | YES | `now()` | When the interpretation was created |
| `updated_at` | TIMESTAMPTZ | YES | `now()` | Last update timestamp |
| `version` | INTEGER | YES | 1 | Version number for multiple interpretations |
| `previous_version_id` | UUID | YES | - | Link to previous version if re-interpreted |

## Data Structures

### `full_response` JSONB Structure
```json
{
  "condensedInterpretation": "Full interpretation text...",
  "symbols": ["symbol1", "symbol2"],
  "emotionalTone": {
    "primary": "emotion",
    "secondary": "emotion", 
    "intensity": 0.0-1.0
  },
  "primaryInsight": "Main insight text...",
  "keyPattern": "Pattern description...",
  "selfReflection": "Question for the dreamer...",
  "advice": "Actionable advice...",
  "generationMetadata": {
    "confidenceScore": 0.0-1.0,
    "model": "model-name",
    "temperature": 0.0-1.0
  }
}
```

### `emotional_tone` JSONB Structure
```json
{
  "primary": "longing",
  "secondary": "peace",
  "intensity": 0.7
}
```

## Sample Data

### Insert Example
```sql
INSERT INTO interpretations (
    dream_id,
    user_id,
    interpreter_type,
    interpretation_summary,
    full_response,
    dream_topic,
    quick_take,
    symbols,
    emotional_tone,
    primary_insight,
    key_pattern,
    knowledge_fragments_used,
    total_fragments_retrieved,
    fragment_ids_used,
    processing_time_ms,
    model_used
) VALUES (
    '2b56cae5-8a73-4b99-bb83-90d594d26e39',
    (SELECT user_id FROM dreams WHERE id = '2b56cae5-8a73-4b99-bb83-90d594d26e39'),
    'freud',
    'Your dream reveals a deep unconscious longing...',
    '{"condensedInterpretation": "...", "symbols": [...], ...}'::jsonb,
    'Return to Primordial State',
    'Dream reveals unconscious longing for primal comfort',
    ARRAY['ocean', 'fish', 'swimming'],
    '{"primary": "longing", "secondary": "peace", "intensity": 0.7}'::jsonb,
    'Profound unconscious desire for pre-natal state...',
    'Regression to primordial state',
    2,
    10,
    ARRAY['fragment-id-1', 'fragment-id-2'],
    23649,
    'gpt-4o'
);
```

## Relationships

### Interpreters Table
The `interpreter_type` column references the `interpreters` table:
- `jung` - Carl Jung (Jungian analysis)
- `freud` - Sigmund Freud (Psychoanalytic approach)
- `mary` - Mary Whiton (Neuroscientific approach)
- `lakshmi` - Lakshmi Devi (Vedantic/spiritual approach)

### Dreams Table
Each interpretation is linked to a single dream via `dream_id`. When a dream is deleted, all its interpretations are automatically deleted (CASCADE).

### Versioning
The table supports multiple versions of interpretations for the same dream/interpreter combination:
- `version` column tracks the version number
- `previous_version_id` links to the previous interpretation
- Unique constraint ensures no duplicate versions

## Row Level Security (RLS)

Users can only view interpretations for their own dreams. The `user_id` column is denormalized from the dreams table to support efficient RLS policies.

## Common Queries

### Get all interpretations for a dream
```sql
SELECT 
    i.*,
    int.name as interpreter_name,
    int.full_name as interpreter_full_name
FROM interpretations i
JOIN interpreters int ON i.interpreter_type = int.id
WHERE i.dream_id = 'dream-id-here'
ORDER BY i.created_at DESC;
```

### Get latest interpretation for each interpreter
```sql
SELECT DISTINCT ON (interpreter_type)
    i.*,
    int.name as interpreter_name
FROM interpretations i
JOIN interpreters int ON i.interpreter_type = int.id
WHERE i.dream_id = 'dream-id-here'
ORDER BY i.interpreter_type, i.version DESC;
```

### Get interpretations with specific emotional tone
```sql
SELECT * FROM interpretations
WHERE emotional_tone->>'primary' = 'anxiety'
   OR emotional_tone->>'secondary' = 'anxiety';
```

## Backend Integration Notes

1. **Missing Save Operation**: The current backend generates interpretations but doesn't save them to the database. The save operation needs to be added after interpretation generation.

2. **Column Mapping**: The backend generates data that needs to be mapped to the correct columns:
   - `condensedInterpretation` → `interpretation_summary`
   - `interpreterType` → `interpreter_type`
   - The complete response → `full_response` as JSONB

3. **Required Fields**: Always include `user_id` (from the dreams table) when inserting.

4. **Unique Constraint Handling**: Use `ON CONFLICT` to handle re-interpretations:
   ```sql
   ON CONFLICT (dream_id, interpreter_type, version) 
   DO UPDATE SET ...
   ```