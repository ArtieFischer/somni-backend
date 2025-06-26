# Interpretations Table Migration Documentation

## Overview
This migration redesigns the `interpretations` table to better support dream interpretation storage, future AI memory features, and efficient querying.

## Database Changes

### New Table Structure: `interpretations`

| Column | Type | Description | Default |
|--------|------|-------------|---------|
| `id` | UUID | Primary key | `gen_random_uuid()` |
| `dream_id` | UUID | Foreign key to dreams table | Required |
| `user_id` | UUID | Foreign key to profiles table | Required |
| `interpreter_type` | TEXT | References interpreters table (jung/lakshmi/freud/mary) | Required |
| **Content Fields** |
| `interpretation_summary` | TEXT | 2-3 paragraph summary shown to users | Required |
| `full_response` | JSONB | Complete structured JSON response from interpreter | Required |
| **Extracted Fields for Search/Filtering** |
| `dream_topic` | TEXT | Brief phrase capturing core theme | Required |
| `quick_take` | TEXT | 2-3 sentence summary | Required |
| `symbols` | TEXT[] | Array of key symbols identified | `{}` |
| `emotional_tone` | JSONB | `{primary, secondary, intensity}` | NULL |
| `primary_insight` | TEXT | Main psychological/spiritual insight | NULL |
| `key_pattern` | TEXT | Recurring pattern identified | NULL |
| **Metadata** |
| `knowledge_fragments_used` | INTEGER | Count of fragments that enriched interpretation | 0 |
| `total_fragments_retrieved` | INTEGER | Total fragments before quality control | 0 |
| `fragment_ids_used` | TEXT[] | Array of fragment IDs used | `{}` |
| `processing_time_ms` | INTEGER | Time taken to generate | NULL |
| `model_used` | TEXT | AI model used | 'gpt-4o' |
| **Timestamps** |
| `created_at` | TIMESTAMPTZ | Creation timestamp | `NOW()` |
| `updated_at` | TIMESTAMPTZ | Last update timestamp | `NOW()` |
| **Versioning** |
| `version` | INTEGER | Version number for re-interpretations | 1 |
| `previous_version_id` | UUID | Reference to previous interpretation version | NULL |

### Indexes
- `idx_interpretations_user_id` - User queries
- `idx_interpretations_dream_id` - Dream lookups
- `idx_interpretations_interpreter_type` - Filter by interpreter
- `idx_interpretations_symbols` (GIN) - Symbol searches
- `idx_interpretations_fragment_ids` (GIN) - Fragment usage analysis
- `idx_interpretations_created_at` - Time-based queries
- `idx_interpretations_dream_interpreter` - Composite for unique lookups
- `idx_interpretations_search` (GIN) - Full-text search on content

### Row Level Security (RLS)
- Users can only view and insert their own interpretations
- Service role has full access

### Constraints
- Unique constraint on `(dream_id, interpreter_type, version)`
- Foreign key constraints with CASCADE delete

## Full Response JSON Structure

The `full_response` JSONB field stores the complete interpretation with this structure:

```json
{
  "dreamId": "uuid",
  "interpreterId": "jung|lakshmi|freud|mary",
  "interpretation": "Full interpretation text...",
  "dreamTopic": "Brief topic",
  "quickTake": "2-3 sentence summary",
  "symbols": ["symbol1", "symbol2"],
  "emotionalTone": {
    "primary": "nostalgia",
    "secondary": "longing", 
    "intensity": 0.8
  },
  "interpretationCore": {
    "type": "jungian|vedantic|freudian|neuroscientific",
    "primaryInsight": "Main insight",
    "keyPattern": "Pattern identified",
    "personalGuidance": "Specific guidance",
    // Plus interpreter-specific fields
  },
  "practicalGuidance": ["action1", "action2"],
  "selfReflection": "Question for reflection",
  "generationMetadata": {
    "model": "gpt-4o",
    "temperature": 0.7,
    "knowledgeFragmentsUsed": 3,
    "totalFragmentsRetrieved": 10,
    "fragmentIdsUsed": ["frag-123", "frag-456"]
  }
}
```

## API Endpoints

### New Endpoint: Interpret by ID
```
POST /api/v1/dreams/interpret-by-id
```

**Request Body:**
```json
{
  "dreamId": "uuid",
  "userId": "uuid",
  "interpreterType": "jung|lakshmi|freud|mary",
  "options": {
    "saveToDatabase": true,    // default: true
    "includeDebugInfo": false  // default: false
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "interpretation": { /* full interpretation object */ },
    "metadata": {
      "interpreterId": "jung",
      "processingTime": 3456,
      "themesUsed": 5,
      "saved": true
    }
  }
}
```

### Existing Endpoints
- `POST /api/v1/dreams/interpret` - Interpret with provided transcription
- `GET /api/v1/dreams/:dreamId/interpretations` - Get all interpretations
- `GET /api/v1/dreams/interpreters` - List available interpreters

## Frontend Implementation Guide

### 1. Update Types

```typescript
// types/interpretation.ts
export interface InterpretationSummary {
  id: string;
  dreamId: string;
  interpreterType: 'jung' | 'lakshmi' | 'freud' | 'mary';
  interpretationSummary: string;
  dreamTopic: string;
  quickTake: string;
  symbols: string[];
  emotionalTone?: {
    primary: string;
    secondary: string;
    intensity: number;
  };
  createdAt: string;
  version: number;
}

export interface InterpretationFull extends InterpretationSummary {
  fullResponse: any; // Complete JSON response
  primaryInsight?: string;
  keyPattern?: string;
  knowledgeFragmentsUsed: number;
  fragmentIdsUsed: string[];
  processingTimeMs?: number;
}

export interface InterpretByIdRequest {
  dreamId: string;
  userId: string;
  interpreterType: 'jung' | 'lakshmi' | 'freud' | 'mary';
  options?: {
    saveToDatabase?: boolean;
    includeDebugInfo?: boolean;
  };
}
```

### 2. API Service

```typescript
// services/interpretationService.ts
export const interpretationService = {
  // New method using just IDs
  async interpretDreamById(
    dreamId: string,
    userId: string,
    interpreterType: string
  ): Promise<InterpretationFull> {
    const response = await fetch('/api/v1/dreams/interpret-by-id', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getAuthToken()}`
      },
      body: JSON.stringify({
        dreamId,
        userId,
        interpreterType,
        options: { saveToDatabase: true }
      })
    });
    
    const result = await response.json();
    if (!result.success) {
      throw new Error(result.error);
    }
    
    return result.data.interpretation;
  },

  // Get saved interpretations
  async getDreamInterpretations(dreamId: string): Promise<InterpretationSummary[]> {
    const { data, error } = await supabase
      .from('interpretations')
      .select(`
        id,
        dream_id,
        interpreter_type,
        interpretation_summary,
        dream_topic,
        quick_take,
        symbols,
        emotional_tone,
        created_at,
        version
      `)
      .eq('dream_id', dreamId)
      .order('created_at', { ascending: false });
      
    if (error) throw error;
    return data;
  },

  // Get full interpretation details
  async getInterpretationDetails(interpretationId: string): Promise<InterpretationFull> {
    const { data, error } = await supabase
      .from('interpretations')
      .select('*')
      .eq('id', interpretationId)
      .single();
      
    if (error) throw error;
    return data;
  }
};
```

### 3. React Component Example

```tsx
// components/DreamInterpretation.tsx
import { useState } from 'react';
import { interpretationService } from '../services/interpretationService';

export function DreamInterpretation({ dreamId, userId }) {
  const [loading, setLoading] = useState(false);
  const [interpretation, setInterpretation] = useState(null);
  const [selectedInterpreter, setSelectedInterpreter] = useState('jung');

  const handleInterpret = async () => {
    setLoading(true);
    try {
      const result = await interpretationService.interpretDreamById(
        dreamId,
        userId,
        selectedInterpreter
      );
      setInterpretation(result);
    } catch (error) {
      console.error('Interpretation failed:', error);
      // Handle error
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {/* Interpreter selection */}
      <select 
        value={selectedInterpreter} 
        onChange={(e) => setSelectedInterpreter(e.target.value)}
      >
        <option value="jung">Carl Jung</option>
        <option value="lakshmi">Swami Lakshmi</option>
        <option value="freud">Sigmund Freud</option>
        <option value="mary">Dr. Mary Chen</option>
      </select>

      <button onClick={handleInterpret} disabled={loading}>
        {loading ? 'Interpreting...' : 'Interpret Dream'}
      </button>

      {interpretation && (
        <div>
          <h2>{interpretation.dreamTopic}</h2>
          <p className="quick-take">{interpretation.quickTake}</p>
          
          {interpretation.emotionalTone && (
            <div className="emotional-tone">
              <span>Emotion: {interpretation.emotionalTone.primary}</span>
              <span>Intensity: {interpretation.emotionalTone.intensity}</span>
            </div>
          )}

          <div className="interpretation-text">
            {interpretation.interpretation}
          </div>

          <div className="symbols">
            {interpretation.symbols.map(symbol => (
              <span key={symbol} className="symbol-tag">{symbol}</span>
            ))}
          </div>

          {interpretation.practicalGuidance && (
            <ul className="guidance">
              {interpretation.practicalGuidance.map((guidance, i) => (
                <li key={i}>{guidance}</li>
              ))}
            </ul>
          )}

          <p className="self-reflection">
            {interpretation.selfReflection}
          </p>
        </div>
      )}
    </div>
  );
}
```

### 4. Display Saved Interpretations

```tsx
// components/SavedInterpretations.tsx
export function SavedInterpretations({ dreamId }) {
  const [interpretations, setInterpretations] = useState([]);
  
  useEffect(() => {
    interpretationService.getDreamInterpretations(dreamId)
      .then(setInterpretations)
      .catch(console.error);
  }, [dreamId]);

  return (
    <div>
      {interpretations.map(interp => (
        <div key={interp.id} className="interpretation-card">
          <h3>{getInterpreterName(interp.interpreterType)}</h3>
          <p>{interp.quickTake}</p>
          <div className="meta">
            <span>{new Date(interp.createdAt).toLocaleDateString()}</span>
            {interp.emotionalTone && (
              <span>Emotion: {interp.emotionalTone.primary}</span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
```

## Benefits of This Design

1. **Performance**: Extracted fields allow fast filtering without parsing JSON
2. **Future AI Memory**: Fragment IDs enable building interpreter preferences
3. **Versioning**: Support for re-interpretations with history
4. **Search**: Full-text search and symbol/theme filtering
5. **Analytics**: Track which fragments are most useful
6. **Flexibility**: JSONB stores complete response for future needs

## Migration Notes

- The migration drops and recreates the table, so run only if table is empty
- The `update_updated_at_column()` function is created if it doesn't exist
- All existing interpreter types (jung, lakshmi, freud, mary) are supported
- Fragment IDs are tracked for future "memory" features