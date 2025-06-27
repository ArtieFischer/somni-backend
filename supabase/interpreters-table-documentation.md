# Interpreters Table Documentation

## Overview
The `interpreters` table stores metadata about the available dream interpretation experts/approaches. Each interpreter represents a different psychological or spiritual approach to dream analysis.

## Table Structure

### Primary Key
- **Primary Key**: `id` (TEXT) - Short identifier like 'jung', 'freud'

### Columns

| Column Name | Type | Nullable | Default | Description |
|-------------|------|----------|---------|-------------|
| `id` | TEXT | NO | - | Unique identifier (e.g., 'jung', 'freud') |
| `name` | TEXT | NO | - | Short display name (e.g., 'Carl', 'Sigmund') |
| `full_name` | TEXT | NO | - | Full name (e.g., 'Carl Jung', 'Sigmund Freud') |
| `description` | TEXT | NO | - | Description of the interpretation approach |
| `image_url` | TEXT | NO | - | URL to interpreter's image/avatar |
| `interpretation_style` | JSONB | NO | - | Detailed style configuration |
| `created_at` | TIMESTAMPTZ | YES | `now()` | When the interpreter was added |

## Current Interpreters

| ID | Name | Full Name | Description |
|----|------|-----------|-------------|
| `jung` | Carl | Carl Jung | Analytical psychology approach focusing on archetypes and the collective unconscious |
| `freud` | Sigmund | Sigmund Freud | Psychoanalytic approach exploring unconscious desires and childhood connections |
| `mary` | Mary | Mary Whiton | Neuroscientific approach understanding dreams through brain activity |
| `lakshmi` | Lakshmi | Lakshmi Devi | Vedantic approach integrating Eastern spiritual wisdom |

## interpretation_style JSONB Structure

The `interpretation_style` field contains configuration for how each interpreter analyzes dreams:

```json
{
  "approach": "psychological|spiritual|scientific",
  "focus_areas": ["archetypes", "unconscious", "symbols"],
  "personality_traits": {
    "formality": "high|medium|low",
    "empathy": "high|medium|low",
    "directness": "high|medium|low"
  },
  "specialties": ["shadow work", "trauma", "spiritual growth"],
  "cultural_background": "Western|Eastern|Universal",
  "theoretical_framework": ["Jungian", "Freudian", "Neuroscience", "Vedantic"]
}
```

## Relationships

### Interpretations Table
The `interpreters` table is referenced by `interpretations.interpreter_type`. Each interpretation must reference a valid interpreter.

### Profiles Table
Users can have a preferred interpreter stored in `profiles.dream_interpreter`.

## Sample Queries

### Get all active interpreters
```sql
SELECT 
    id,
    name,
    full_name,
    description,
    image_url
FROM interpreters
ORDER BY name;
```

### Get interpreter with their interpretation count
```sql
SELECT 
    i.id,
    i.full_name,
    i.description,
    COUNT(int.id) as total_interpretations
FROM interpreters i
LEFT JOIN interpretations int ON i.id = int.interpreter_type
GROUP BY i.id, i.full_name, i.description
ORDER BY total_interpretations DESC;
```

### Get interpreter styles
```sql
SELECT 
    id,
    name,
    interpretation_style->>'approach' as approach,
    interpretation_style->'focus_areas' as focus_areas
FROM interpreters;
```

## Backend Integration

The backend's interpreter registry should match these database entries. Each interpreter in the code should correspond to a record in this table.

### Adding a New Interpreter
```sql
INSERT INTO interpreters (
    id,
    name,
    full_name,
    description,
    image_url,
    interpretation_style
) VALUES (
    'new_interpreter',
    'First Name',
    'Full Name with Title',
    'Description of their approach',
    'https://example.com/image.jpg',
    '{
        "approach": "psychological",
        "focus_areas": ["area1", "area2"],
        "personality_traits": {
            "formality": "medium",
            "empathy": "high",
            "directness": "medium"
        }
    }'::jsonb
);
```

## Image URLs
Currently using placeholder images. These should be updated with actual interpreter avatars or thematic images that represent each interpretation style.